# JIRA Configuration Guide

This guide explains how to configure JIRA integration for the NDB Capacity Planner.

## Environment Variables

Add the following variables to your `.env` file:

```bash
# JIRA Configuration
JIRA_BASE_URL=https://jira.nutanix.com
JIRA_PROJECT_KEY=ERA
JIRA_USERNAME=your_jira_username
JIRA_API_TOKEN=your_jira_api_token_here

# Optional: JIRA API Version
JIRA_API_VERSION=3
```

## JIRA API Token Setup

To generate your JIRA API token:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token and paste it as `JIRA_API_TOKEN` in your .env file

## JIRA Project Configuration

The application is configured to work with the ERA project. To change this:

1. Update `JIRA_PROJECT_KEY` in your `.env` file
2. Ensure you have access to the project in JIRA
3. Restart the backend service

## Testing JIRA Connection

Use the provided test script to verify your JIRA configuration:

```bash
node test-jira-connection.js
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check your API token and username
2. **Timeout**: Verify network connectivity and JIRA URL
3. **No releases found**: Ensure the project has unreleased versions

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=jira:*
```

## Security Notes

- Never commit your `.env` file to version control
- Rotate your JIRA API tokens regularly
- Use environment-specific tokens for different deployments