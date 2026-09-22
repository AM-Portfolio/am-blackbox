import requests
from django.conf import settings
from django.db import connection
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET

from .models import Evidence, Incident, IncidentEvent


def _cause_badge(incident):
    text = (incident.suspected_cause or '') + ' ' + (incident.confirmed_cause or '')
    conf = (incident.diagnosis_confidence or '').lower()
    lower = text.lower()
    if 'unreachable' in lower or 'silent' in lower or 'dead' in lower:
        return 'vps-dead'
    if 'oom' in lower:
        return 'oom'
    if 'memory' in lower or 'pressure' in lower or 'notready' in lower or 'out of state' in lower:
        return 'vps-pressure'
    if conf == 'high' and text.strip():
        return 'diagnosed'
    return None


def _extract_oom_and_vps(evidence_qs):
    offenders = []
    vps_state = None
    for ev in evidence_qs:
        meta = ev.metadata or {}
        if isinstance(meta, str):
            continue
        if meta.get('offenders'):
            offenders.extend(meta['offenders'])
        if meta.get('vpsState'):
            vps_state = meta['vpsState']
    # de-dupe offenders by ns/pod
    seen = set()
    unique = []
    for o in offenders:
        key = f"{o.get('namespace')}/{o.get('pod')}"
        if key not in seen:
            seen.add(key)
            unique.append(o)
    return unique, vps_state


@require_GET
def incident_list(request):
    incidents = list(Incident.objects.all()[:100])
    for i in incidents:
        i.cause_badge = _cause_badge(i)
    return render(request, 'portal/incident_list.html', {
        'incidents': incidents,
        'api_url': settings.BLACKBOX_API_URL,
    })


@require_GET
def incident_detail(request, incident_id):
    incident = get_object_or_404(Incident, pk=incident_id)
    events = IncidentEvent.objects.filter(incident_id=incident.id)
    evidence = list(Evidence.objects.filter(incident_id=incident.id))
    oom_offenders, vps_state = _extract_oom_and_vps(evidence)
    return render(request, 'portal/incident_detail.html', {
        'incident': incident,
        'events': events,
        'evidence': evidence,
        'cause_badge': _cause_badge(incident),
        'oom_offenders': oom_offenders,
        'vps_state': vps_state,
    })


@require_GET
def health(request):
    db_ok = False
    db_error = None
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            db_ok = cursor.fetchone()[0] == 1
    except Exception as e:
        db_error = str(e)

    api_ok = False
    api_body = None
    api_error = None
    vps_health = None
    try:
        r = requests.get(f"{settings.BLACKBOX_API_URL.rstrip('/')}/health", timeout=3)
        api_ok = r.ok
        api_body = r.json() if r.ok else r.text
    except Exception as e:
        api_error = str(e)

    environment = request.GET.get('environment') or 'nonprod'
    try:
        vr = requests.get(
            f"{settings.BLACKBOX_API_URL.rstrip('/')}/api/vps-health",
            params={'environment': environment},
            timeout=5,
        )
        if vr.ok:
            vps_health = vr.json()
    except Exception:
        vps_health = None

    grafana_dashboard_url = getattr(
        settings,
        'GRAFANA_VPS_DASHBOARD_URL',
        'https://mellowiguana2829.grafana.net/d/am-blackbox-vps-host',
    )

    status = 'ok' if db_ok and api_ok else 'degraded'
    return render(request, 'portal/health.html', {
        'status': status,
        'db_ok': db_ok,
        'db_error': db_error,
        'api_ok': api_ok,
        'api_body': api_body,
        'api_error': api_error,
        'api_url': settings.BLACKBOX_API_URL,
        'vps_health': vps_health,
        'environment': environment,
        'grafana_dashboard_url': grafana_dashboard_url,
    })
