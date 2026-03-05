# AI Coding Assistant Implementation

## Overview
Added an AI-powered coding assistant specialized for robotics and industrial automation programming to the LMS platform.

## Features

### Specialized Programming Support
The AI Assistant provides expert help in 5 key areas:

1. **Python Programming**
   - Robot control and automation
   - Data processing
   - Sensor integration
   - Best practices and debugging

2. **Ladder Logic**
   - PLC programming
   - Relay logic and timers
   - Industrial automation sequences
   - Manufacturing control systems

3. **Doosan Dart Studio**
   - Doosan Robot Language (DRL)
   - Motion commands (movej, movel, movejx, movelx)
   - I/O operations
   - Robot safety and programming

4. **HMI Design**
   - Human-Machine Interface development
   - SCADA systems
   - Touchscreen interfaces
   - Industrial visualization

5. **General Robotics**
   - Cross-domain questions
   - System integration
   - Troubleshooting

## Technical Implementation

### Frontend Component
- **Location**: `src/components/pages/AIAssistantPage.tsx`
- **Framework**: React with TypeScript
- **AI Providers**: 
  - Google Gemini (FREE - Default)
  - OpenAI GPT (Paid - Optional)
- **Features**:
  - Real-time chat interface
  - Language-specific system prompts
  - Code syntax highlighting support
  - Message history
  - API key management
  - Provider selection

### Integration Points
1. **Dashboard**: Added to `src/components/Dashboard.tsx`
2. **Sidebar**: Added menu item in `src/components/Sidebar.tsx`
3. **Access**: Available to all user roles (Admin, Developer, Instructor, Trainee, TESDA Scholar)

### API Configuration

#### Google Gemini (Recommended - FREE)
- **API**: Google AI Studio API
- **Models**: Gemini 1.5 Flash, Gemini Pro
- **Cost**: Completely FREE
- **Limits**: 1,500 requests/day, 15 requests/minute
- **Setup**: Get free API key from https://aistudio.google.com/app/apikey

#### OpenAI (Optional - Paid)
- **API**: OpenAI Chat Completions API
- **Models**: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
- **Cost**: Pay-as-you-go ($0.002-$0.09 per 1K tokens)
- **Setup**: Requires credit card and API key from https://platform.openai.com/api-keys

## Usage Instructions

### For Administrators - Initial Setup

**Option 1: Google Gemini (FREE - Recommended)**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)
5. Share this key with all users

**Option 2: OpenAI (Paid)**
1. Go to https://platform.openai.com/api-keys
2. Create account and add billing
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. Share this key with users who need premium quality

### For All Users
1. Navigate to "AI Assistant" from the sidebar
2. Choose your provider (Gemini recommended)
3. Enter the API key when prompted
4. Select the programming language/domain
5. Start asking questions!
- Understanding code concepts
- Debugging programs
- Learning syntax
- Best practices
- Real-world examples

### Example Questions

**Python:**
- "How do I control a robot arm using Python?"
- "Show me how to read sensor data"
- "What's the best way to handle robot errors?"

**Ladder Logic:**
- "Explain how timers work in ladder logic"
- "Create a start/stop circuit with safety interlock"
- "How do I implement a conveyor belt control?"

**Doosan Dart:**
- "What's the difference between movej and movel?"
- "How do I set digital outputs?"
- "Show me a pick and place program"

**HMI:**
- "Design a temperature monitoring interface"
- "How do I create alarm displays?"
- "Best practices for operator screens"

## Security & Privacy

### API Key Storage
- Keys stored locally in browser
- Not transmitted to LMS backend
- Users control their own API usage

### Data Privacy
- Conversations are not stored in database
- Messages sent directly to OpenAI
- No logging of sensitive code

## Cost Considerations

### Google Gemini (FREE)
- **Cost**: $0 (Completely free)
- **Limits**: 1,500 requests/day, 15 requests/minute
- **Best for**: Schools, students, general learning
- **Quality**: Good for coding assistance
- **Recommendation**: ⭐ Use this as default

### OpenAI (Paid)
- **GPT-3.5 Turbo**: ~$0.002 per 1K tokens
- **GPT-4**: ~$0.09 per 1K tokens
- **Average conversation**: $0.01 - $0.50
- **Best for**: Complex problems, premium quality
- **Recommendation**: Optional upgrade for advanced users

### Monthly Cost Estimates (20 students)

**Using Gemini (FREE):**
- Cost: $0/month ✅
- 1,500 requests/day = 75 per student
- Perfect for educational use

**Using GPT-3.5 Turbo:**
- 10 questions/day per student
- Cost: ~$60-180/month

**Using GPT-4:**
- 10 questions/day per student  
- Cost: ~$600-1,800/month

## Future Enhancements

### Planned Features
1. **Code Execution**: Run Python code in sandbox
2. **Diagram Generation**: Visual ladder logic diagrams
3. **Project Templates**: Pre-built robot programs
4. **Multi-language**: Support for more languages
5. **Voice Input**: Speech-to-text for hands-free coding
6. **Code Review**: Automated code analysis
7. **Learning Paths**: Guided tutorials

### Integration Ideas
- Link to course materials
- Save conversations to student profiles
- Generate practice exercises
- Track learning progress

## Troubleshooting

### Common Issues

**"API Key Required" Error**
- Click Settings to enter your API key
- For Gemini: Get free key from https://aistudio.google.com/app/apikey
- For OpenAI: Get paid key from https://platform.openai.com/api-keys

**"Failed to get response" Error (Gemini)**
- Check your API key is valid
- Verify you haven't exceeded 1,500 requests/day
- Check internet connection
- Try again in a few seconds (rate limit)

**"Failed to get response" Error (OpenAI)**
- Check your API key is valid
- Verify you have OpenAI credits
- Check internet connection
- Ensure you have access to the selected model

**Slow Responses**
- Gemini 1.5 Flash: Usually 1-3 seconds
- GPT-3.5: Usually 2-5 seconds
- GPT-4: Can take 5-10 seconds

**Rate Limit Errors (Gemini)**
- Free tier: 15 requests/minute
- If multiple students use simultaneously, some may need to wait
- This is normal and requests will work after a few seconds

## Files Modified

1. `src/components/pages/AIAssistantPage.tsx` - New AI assistant component
2. `src/components/Dashboard.tsx` - Added AI assistant page type and routing
3. `src/components/Sidebar.tsx` - Added AI assistant menu item
4. `AI_ASSISTANT_IMPLEMENTATION.md` - This documentation

## Access Control

Currently accessible to:
- ✅ Admin
- ✅ Developer
- ✅ Instructor
- ✅ Trainee
- ✅ TESDA Scholar

All users have access to the AI Assistant to help with their learning and development needs.

## Support

For issues or feature requests:
1. Use the "Bugs and Request" feature in the LMS
2. Contact the development team
3. Check OpenAI status: https://status.openai.com/

---

**Implementation Date**: March 5, 2026
**Version**: 1.0.0
**Status**: ✅ Active
