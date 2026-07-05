import type { Execution } from './store/execution-store'
import type { User } from './store/auth-store'

export const MOCK_USER: User = {
  id: 'usr_01',
  name: 'Alex Rivera',
  email: 'alex@flowai.dev',
  role: 'user',
  emailVerified: true,
  createdAt: '2024-01-15T10:00:00Z',
}

// export const MOCK_ADMIN: User = {
//   id: 'usr_admin',
//   name: 'Jordan Lee',
//   email: 'admin@flowai.dev',
//   role: 'admin',
//   emailVerified: true,
//   createdAt: '2023-12-01T10:00:00Z',
// }

const OUTPUTS = [
  `## AI-Generated Content Report

**Summary:** Your automation completed successfully with high confidence.

The analysis identified **3 key action items**:
1. Optimize the onboarding flow by reducing steps from 7 to 4
2. Add a progress indicator to the checkout process
3. Implement email re-engagement for users inactive for 14+ days

**Estimated Impact:** +23% conversion rate improvement based on similar cohort analysis.

### Detailed Breakdown
The model processed 1,847 data points across 6 dimensions. Sentiment analysis returned a positive score of 0.82.`,
  `## Content Generation Complete

Your blog post draft is ready for review:

**Title:** "10 Ways AI is Transforming Modern Business Workflows"

The article covers automation trends, productivity metrics, and real-world case studies from Fortune 500 companies. Word count: 1,240 words. SEO score: 94/100.

*Keywords detected:* AI automation, workflow optimization, business intelligence, machine learning`,
  `## Data Processing Result

Successfully processed **2,341 records** from your dataset.

| Metric | Value |
|--------|-------|
| Accuracy | 97.3% |
| Processing Time | 1.2s |
| Anomalies Found | 14 |
| Cleaned Records | 2,327 |

All results have been saved and are ready for download.`,
]

export const MOCK_EXECUTIONS: Execution[] = Array.from({ length: 20 }, (_, i) => ({
  id: `exec_${String(i + 1).padStart(4, '0')}`,
  userId: 'usr_01',
  workflowName: ['Content Generator', 'Data Analyzer', 'Email Drafter', 'Report Builder', 'SEO Optimizer'][i % 5],
  status: (['success', 'success', 'success', 'failed', 'running'] as const)[i % 5],
  input: { topic: 'AI Automation', tone: 'professional', length: 'medium' },
  output: OUTPUTS[i % 3],
  prompt: 'Generate a comprehensive analysis report based on the provided data...',
  modelName: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini', 'gemini-1.5-pro'][i % 4],
  tokensUsed: Math.floor(Math.random() * 3000) + 500,
  executionTime: Math.floor(Math.random() * 8000) + 800,
  createdAt: new Date(Date.now() - i * 86400000 * 1.5).toISOString(),
  updatedAt: new Date(Date.now() - i * 86400000 * 1.5 + 5000).toISOString(),
}))

export const MOCK_USERS: (User & { tokensUsed: number; executions: number; status: string })[] = [
  { ...MOCK_USER, tokensUsed: 45230, executions: 87, status: 'active' },
  { id: 'usr_02', name: 'Sam Chen', email: 'sam@acme.com', role: 'user', emailVerified: true, createdAt: '2024-02-01T10:00:00Z', tokensUsed: 23100, executions: 42, status: 'active' },
  { id: 'usr_03', name: 'Morgan Davis', email: 'morgan@startup.io', role: 'user', emailVerified: false, createdAt: '2024-03-10T10:00:00Z', tokensUsed: 5400, executions: 11, status: 'pending' },
  { id: 'usr_04', name: 'Taylor Kim', email: 'taylor@corp.net', role: 'user', emailVerified: true, createdAt: '2024-01-28T10:00:00Z', tokensUsed: 89000, executions: 201, status: 'active' },
  { id: 'usr_05', name: 'Casey Wu', email: 'casey@design.co', role: 'user', emailVerified: true, createdAt: '2024-04-05T10:00:00Z', tokensUsed: 12300, executions: 28, status: 'suspended' },
  // { ...MOCK_ADMIN, tokensUsed: 112000, executions: 350, status: 'active' },
]

export const ANALYTICS = {
  totalExecutions: 12847,
  totalTokens: 48200000,
  successRate: 96.4,
  activeUsers: 1247,
  executionsByDay: [
    { date: 'Jun 23', count: 420 },
    { date: 'Jun 24', count: 380 },
    { date: 'Jun 25', count: 510 },
    { date: 'Jun 26', count: 445 },
    { date: 'Jun 27', count: 620 },
    { date: 'Jun 28', count: 580 },
    { date: 'Jun 29', count: 490 },
  ],
  tokensByModel: [
    { model: 'GPT-4o', tokens: 22000000 },
    { model: 'Claude 3.5', tokens: 14000000 },
    { model: 'GPT-4o-mini', tokens: 8000000 },
    { model: 'Gemini 1.5', tokens: 4200000 },
  ],
}
