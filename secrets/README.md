# Oracle Cloud credentials (local only)

This directory holds OCI API signing credentials. Real keys are **gitignored**.

## One-time setup

1. In OCI Console: **Identity & Security → Users → (your user) → API Keys → Add API Key**.
2. Download the private key and place it here as `oci_api_key.pem`.
3. Copy the config template and fill in OCIDs + fingerprint:

```bash
cp secrets/oci.config.example secrets/oci.config
```

4. Or set the same values in `.env` / environment:

```text
ORACLE_CLOUD_REGION=ap-mumbai-1
ORACLE_CLOUD_TENANCY=ocid1.tenancy.oc1.....
ORACLE_CLOUD_USER=ocid1.user.oc1......
ORACLE_CLOUD_FINGERPRINT=aa:bb:...
ORACLE_CLOUD_KEY_FILE=secrets/oci_api_key.pem
```

5. Check status:

```bash
npm run oracle:status
```

Do **not** use Identity Cloud browser JWTs (`*.tok`) for this — OCI Compute/Limits need API key signing.
