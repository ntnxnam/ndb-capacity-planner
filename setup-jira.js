#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 NDB Capacity Planner - JIRA Setup');
console.log('=====================================\n');

const questions = [
  {
    key: 'JIRA_BASE_URL',
    question: 'Enter your JIRA base URL (e.g., https://jira.nutanix.com): ',
    default: 'https://jira.nutanix.com'
  },
  {
    key: 'JIRA_PROJECT_KEY',
    question: 'Enter the JIRA project key (e.g., ERA): ',
    default: 'ERA'
  },
  {
    key: 'JIRA_USERNAME',
    question: 'Enter your JIRA username: ',
    default: ''
  },
  {
    key: 'JIRA_API_TOKEN',
    question: 'Enter your JIRA API token: ',
    default: ''
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    generateEnvFile();
    return;
  }

  const q = questions[index];
  rl.question(q.question, (answer) => {
    answers[q.key] = answer.trim() || q.default;
    askQuestion(index + 1);
  });
}

function generateEnvFile() {
  const envContent = `# NDB Capacity Planner Environment Configuration
# Generated on ${new Date().toISOString()}

# JIRA Configuration - REAL JIRA CONNECTION
JIRA_BASE_URL=${answers.JIRA_BASE_URL}
JIRA_PROJECT_KEY=${answers.JIRA_PROJECT_KEY}
JIRA_USERNAME=${answers.JIRA_USERNAME}
JIRA_API_TOKEN=${answers.JIRA_API_TOKEN}

# OKTA Configuration (for production)
OKTA_DOMAIN=nutanix.okta.com
OKTA_CLIENT_ID=local-dev
OKTA_CLIENT_SECRET=local-dev-secret

# Database Configuration
DATABASE_PATH=./data/database/ndb_capacity_planner.db

# Server Configuration
PORT=3001
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# RBAC Configuration
RBAC_ENABLED=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
`;

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
    console.log(`📁 Location: ${envPath}`);
    console.log('\n🚀 Next steps:');
    console.log('1. Review the .env file and adjust settings if needed');
    console.log('2. Run: npm install (if not already done)');
    console.log('3. Run: npm run build (backend)');
    console.log('4. Run: npm start (backend)');
    console.log('5. Run: cd frontend && npm run dev (frontend)');
    console.log('\n🔍 Test JIRA connection:');
    console.log('node test-jira-connection.js');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }

  rl.close();
}

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  rl.question('⚠️  .env file already exists. Overwrite? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      askQuestion(0);
    } else {
      console.log('❌ Setup cancelled.');
      rl.close();
    }
  });
} else {
  askQuestion(0);
}