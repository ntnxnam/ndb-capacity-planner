# SMTP Configuration

## Nutanix SMTP Server Settings

For email functionality in the NDB Capacity Planner application:

```
SMTP Server: mailrelay.dyn.nutanix.com
Port: 25
Credentials: Not needed
Encryption: None
```

## Environment Variables

Add these to your `.env` file when implementing email features:

```bash
SMTP_HOST=mailrelay.dyn.nutanix.com
SMTP_PORT=25
SMTP_SECURE=false
SMTP_REQUIRE_AUTH=false
```

## Usage Notes

- This SMTP server is for internal Nutanix use
- No authentication required
- No encryption/TLS needed
- Standard port 25 for plain SMTP

## Potential Use Cases

- Release plan notifications
- User account notifications
- System alerts
- Calculation completion notifications
- Data validation alerts
