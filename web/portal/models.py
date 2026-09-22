from django.db import models


class Incident(models.Model):
    id = models.UUIDField(primary_key=True)
    environment = models.CharField(max_length=50)
    severity = models.CharField(max_length=50)
    type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    affected_service = models.CharField(max_length=255, null=True, blank=True)
    pod = models.CharField(max_length=255, null=True, blank=True)
    node = models.CharField(max_length=255, null=True, blank=True)
    suspected_cause = models.TextField(null=True, blank=True)
    confirmed_cause = models.TextField(null=True, blank=True)
    diagnosis_confidence = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'incidents'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class IncidentEvent(models.Model):
    id = models.UUIDField(primary_key=True)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.DO_NOTHING,
        db_column='incident_id',
        related_name='events',
    )
    event_type = models.CharField(max_length=100)
    message = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    occurred_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'incident_events'
        ordering = ['occurred_at']


class Evidence(models.Model):
    id = models.UUIDField(primary_key=True)
    incident = models.ForeignKey(
        Incident,
        on_delete=models.DO_NOTHING,
        db_column='incident_id',
        related_name='evidence_items',
    )
    source = models.CharField(max_length=100)
    query_reference = models.TextField()
    time_start = models.DateTimeField()
    time_end = models.DateTimeField()
    summary = models.TextField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'evidence'
        ordering = ['created_at']
