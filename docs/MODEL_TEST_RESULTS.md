# AI Model Testing Report

**Generated**: 10/28/2025, 5:33:11 PM
**Total Models Tested**: 53

---

## Summary Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Models** | 53 | 100% |
| ✅ **Working** | 26 | 49.1% |
| 🚧 **Unreleased** | 0 | 0.0% |
| ❌ **Failed** | 27 | 50.9% |
| 🔑 No API Key | 0 | - |
| ⏱️ Rate Limited | 0 | - |
| ⚙️ Parameter Error | 0 | - |
| 🔥 Service Error | 1 | - |
| 📭 Empty Response | 26 | - |

**Average Response Time**: 2450ms

## Provider Breakdown

| Provider | Total | Working | Failed | Avg Response Time |
|----------|-------|---------|--------|-------------------|
| **OpenAI** | 15 | ✅ 12 (80%) | ❌ 3 | 1846ms |
| **Anthropic** | 12 | ✅ 7 (58%) | ❌ 5 | 927ms |
| **Google AI** | 6 | ✅ 1 (17%) | ❌ 5 | 6787ms |
| **Groq** | 5 | ✅ 2 (40%) | ❌ 3 | 262ms |
| **xAI (Grok)** | 9 | ✅ 4 (44%) | ❌ 5 | 5445ms |
| **Perplexity** | 2 | ✅ 0 (0%) | ❌ 2 | 1ms |
| **Mistral** | 2 | ✅ 0 (0%) | ❌ 2 | 0ms |
| **Cohere** | 2 | ✅ 0 (0%) | ❌ 2 | 1ms |


## Status Breakdown

### ✅ Working Models (26)

- **GPT-5 Chat (Latest)** (`gpt-5-chat-latest`) - openai
  - _Response: "Hi there! How are you doing today?"_
- **GPT-5** (`gpt-5`) - openai
  - _Response: "Hello! How can I help you today?"_
- **GPT-5 Mini** (`gpt-5-mini`) - openai
  - _Response: "Hi — how can I help you today? I can answer questi..."_
- **GPT-5 Nano** (`gpt-5-nano`) - openai
  - _Response: "Hi there! How can I help today? I can answer quest..."_
- **GPT-4.1** (`gpt-4.1`) - openai
  - _Response: "Hello! How can I help you today?"_
- **GPT-4.1 Mini** (`gpt-4.1-mini`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **GPT-4.1 Nano** (`gpt-4.1-nano`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **GPT-4o** (`gpt-4o`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **GPT-4 Turbo** (`gpt-4-turbo-preview`) - openai
  - _Response: "Hello! How can I help you today?"_
- **GPT-4** (`gpt-4`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **GPT-3.5 Turbo** (`gpt-3.5-turbo`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **GPT-3.5 Turbo 16k** (`gpt-3.5-turbo-16k`) - openai
  - _Response: "Hello! How can I assist you today?"_
- **Claude 4.5 Sonnet** (`claude-sonnet-4-5-20250929`) - anthropic
  - _Response: "Hello! How can I help you today?"_
- **Claude 4 Sonnet** (`claude-sonnet-4-20250514`) - anthropic
  - _Response: "Hello! How are you doing today? Is there"_
- **Claude 3.7 Sonnet** (`claude-3-7-sonnet-20250219`) - anthropic
  - _Response: "Hello! How can I assist you today? Feel"_
- **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`) - anthropic
  - _Response: "Hello! How can I help you today?"_
- **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`) - anthropic
  - _Response: "Hello! How are you doing today? Is there"_
- **Claude 3 Opus** (`claude-3-opus-20240229`) - anthropic
  - _Response: "Hello! How can I assist you today?"_
- **Claude 3 Haiku** (`claude-3-haiku-20240307`) - anthropic
  - _Response: "Hello! How can I assist you today?"_
- **Gemini 2.0 Flash** (`gemini-2.0-flash`) - google
  - _Response: "Hi there! How can I help you today?"_
- **Llama 3.3 70B** (`llama-3.3-70b-versatile`) - groq
  - _Response: "It's nice to meet you. Is there something"_
- **Llama 3.1 8B Instant** (`llama-3.1-8b-instant`) - groq
  - _Response: "It's nice to meet you. Is there something"_
- **Grok 4 Fast Reasoning** (`grok-4-fast-reasoning`) - xai
  - _Response: "Hi! How can I help you today?"_
- **Grok 4 Fast** (`grok-4-fast-non-reasoning`) - xai
  - _Response: "Hi! How can I help you today?"_
- **Grok 4 (0709)** (`grok-4-0709`) - xai
  - _Response: "Hi! How can I help you today?"_
- **Grok Code Fast** (`grok-code-fast-1`) - xai
  - _Response: "Hello! How can I assist you today? "_

### 🔥 Service Error (1)

- **Gemini 2.0 Flash Lite** (`gemini-2.0-flash-lite`) - google
  - _Request timeout (30000ms): Timeout_

### 📭 Empty Response (26)

- **O3** (`o3`) - openai
  - _Model returned empty response_
- **O4 Mini** (`o4-mini`) - openai
  - _Model returned empty response_
- **GPT-4o Realtime** (`gpt-4o-realtime-preview`) - openai
  - _Model returned empty response_
- **Claude 4.5 Haiku** (`claude-haiku-4-5-20250715`) - anthropic
  - _Model returned empty response_
- **Claude 4 Opus** (`claude-opus-4-1-20250514`) - anthropic
  - _Model returned empty response_
- **Claude 3 Sonnet** (`claude-3-sonnet-20240229`) - anthropic
  - _Model returned empty response_
- **Claude 2.1** (`claude-2.1`) - anthropic
  - _Model returned empty response_
- **Claude 2.0** (`claude-2.0`) - anthropic
  - _Model returned empty response_
- **Gemini 2.5 Pro** (`gemini-2.5-pro`) - google
  - _Model returned empty response_
- **Gemini 2.5 Flash** (`gemini-2.5-flash`) - google
  - _Model returned empty response_
- **Gemini 1.5 Flash** (`gemini-1.5-flash`) - google
  - _Model returned empty response_
- **Gemini 1.5 Flash 8B** (`gemini-1.5-flash-8b`) - google
  - _Model returned empty response_
- **Llama 3 70B Tool Use** (`llama-3-groq-70b-tool-use`) - groq
  - _Model returned empty response_
- **Llama 3 8B Tool Use** (`llama-3-groq-8b-tool-use`) - groq
  - _Model returned empty response_
- **Gemma 2 9B** (`gemma2-9b-it`) - groq
  - _Model returned empty response_
- **Grok 3** (`grok-3`) - xai
  - _Model returned empty response_
- **Grok 3 Mini** (`grok-3-mini`) - xai
  - _Model returned empty response_
- **Grok 2 Vision** (`grok-2-vision-1212`) - xai
  - _Model returned empty response_
- **Grok 2 (1212)** (`grok-2-1212`) - xai
  - _Model returned empty response_
- **Grok 2 Latest** (`grok-2-latest`) - xai
  - _Model returned empty response_
- **Sonar Pro** (`sonar-pro`) - perplexity
  - _Model returned empty response_
- **Sonar Small** (`sonar-small`) - perplexity
  - _Model returned empty response_
- **Mistral Large** (`mistral-large-latest`) - mistral
  - _Model returned empty response_
- **Mistral Small** (`mistral-small-latest`) - mistral
  - _Model returned empty response_
- **Command R+** (`command-r-plus`) - cohere
  - _Model returned empty response_
- **Command R** (`command-r`) - cohere
  - _Model returned empty response_



## Working Models (26)

| Model | Provider | Response Time |
|-------|----------|---------------|
| 🎁 **Llama 3.1 8B Instant** | Groq | 213ms |
| 💰 **GPT-3.5 Turbo 16k** | OpenAI | 515ms |
| 🌟 **Grok 4 Fast** | xAI (Grok) | 616ms |
| 💰 **GPT-4.1 Mini** | OpenAI | 640ms |
| ⚡ **GPT-4.1** | OpenAI | 646ms |
| 💰 **Claude 3 Haiku** | Anthropic | 714ms |
| 🎁 **Llama 3.3 70B** | Groq | 751ms |
| ⚡ **GPT-4** | OpenAI | 1021ms |
| 💰 **GPT-3.5 Turbo** | OpenAI | 1029ms |
| ⚡ **Claude 3.5 Sonnet** | Anthropic | 1049ms |
| 🌟 **Claude 3.7 Sonnet** | Anthropic | 1066ms |
| ⚡ **Claude 3.5 Haiku** | Anthropic | 1103ms |
| 🌟 **GPT-5 Chat (Latest)** | OpenAI | 1314ms |
| 💰 **GPT-4.1 Nano** | OpenAI | 1393ms |
| ⚡ **GPT-4o** | OpenAI | 1454ms |
| 💰 **Claude 3 Opus** | Anthropic | 1567ms |
| 🌟 **Claude 4 Sonnet** | Anthropic | 1844ms |
| 🌟 **Grok 4 Fast Reasoning** | xAI (Grok) | 1908ms |
| ⚡ **GPT-4 Turbo** | OpenAI | 2142ms |
| 🌟 **Claude 4.5 Sonnet** | Anthropic | 2616ms |
| 🌟 **GPT-5** | OpenAI | 2726ms |
| ⚡ **GPT-5 Nano** | OpenAI | 3869ms |
| 🌟 **Grok 4 (0709)** | xAI (Grok) | 4044ms |
| 🎁 **Gemini 2.0 Flash** | Google AI | 5351ms |
| ⚡ **GPT-5 Mini** | OpenAI | 7214ms |
| ⚡ **Grok Code Fast** | xAI (Grok) | 9495ms |


## Unreleased Models

No unreleased models found.

## Failed Models (27)

These models encountered errors during testing:

### O3 (`o3`)
- **Provider**: OpenAI
- **Status**: empty_response
- **Error**: Model returned empty response

### O4 Mini (`o4-mini`)
- **Provider**: OpenAI
- **Status**: empty_response
- **Error**: Model returned empty response

### GPT-4o Realtime (`gpt-4o-realtime-preview`)
- **Provider**: OpenAI
- **Status**: empty_response
- **Error**: Model returned empty response

### Claude 4.5 Haiku (`claude-haiku-4-5-20250715`)
- **Provider**: Anthropic
- **Status**: empty_response
- **Error**: Model returned empty response

### Claude 4 Opus (`claude-opus-4-1-20250514`)
- **Provider**: Anthropic
- **Status**: empty_response
- **Error**: Model returned empty response

### Claude 3 Sonnet (`claude-3-sonnet-20240229`)
- **Provider**: Anthropic
- **Status**: empty_response
- **Error**: Model returned empty response

### Claude 2.1 (`claude-2.1`)
- **Provider**: Anthropic
- **Status**: empty_response
- **Error**: Model returned empty response

### Claude 2.0 (`claude-2.0`)
- **Provider**: Anthropic
- **Status**: empty_response
- **Error**: Model returned empty response

### Gemini 2.5 Pro (`gemini-2.5-pro`)
- **Provider**: Google AI
- **Status**: empty_response
- **Error**: Model returned empty response

### Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Provider**: Google AI
- **Status**: empty_response
- **Error**: Model returned empty response

### Gemini 2.0 Flash Lite (`gemini-2.0-flash-lite`)
- **Provider**: Google AI
- **Status**: service_error
- **Error**: Request timeout (30000ms): Timeout

### Gemini 1.5 Flash (`gemini-1.5-flash`)
- **Provider**: Google AI
- **Status**: empty_response
- **Error**: Model returned empty response

### Gemini 1.5 Flash 8B (`gemini-1.5-flash-8b`)
- **Provider**: Google AI
- **Status**: empty_response
- **Error**: Model returned empty response

### Llama 3 70B Tool Use (`llama-3-groq-70b-tool-use`)
- **Provider**: Groq
- **Status**: empty_response
- **Error**: Model returned empty response

### Llama 3 8B Tool Use (`llama-3-groq-8b-tool-use`)
- **Provider**: Groq
- **Status**: empty_response
- **Error**: Model returned empty response

### Gemma 2 9B (`gemma2-9b-it`)
- **Provider**: Groq
- **Status**: empty_response
- **Error**: Model returned empty response

### Grok 3 (`grok-3`)
- **Provider**: xAI (Grok)
- **Status**: empty_response
- **Error**: Model returned empty response

### Grok 3 Mini (`grok-3-mini`)
- **Provider**: xAI (Grok)
- **Status**: empty_response
- **Error**: Model returned empty response

### Grok 2 Vision (`grok-2-vision-1212`)
- **Provider**: xAI (Grok)
- **Status**: empty_response
- **Error**: Model returned empty response

### Grok 2 (1212) (`grok-2-1212`)
- **Provider**: xAI (Grok)
- **Status**: empty_response
- **Error**: Model returned empty response

### Grok 2 Latest (`grok-2-latest`)
- **Provider**: xAI (Grok)
- **Status**: empty_response
- **Error**: Model returned empty response

### Sonar Pro (`sonar-pro`)
- **Provider**: Perplexity
- **Status**: empty_response
- **Error**: Model returned empty response

### Sonar Small (`sonar-small`)
- **Provider**: Perplexity
- **Status**: empty_response
- **Error**: Model returned empty response

### Mistral Large (`mistral-large-latest`)
- **Provider**: Mistral
- **Status**: empty_response
- **Error**: Model returned empty response

### Mistral Small (`mistral-small-latest`)
- **Provider**: Mistral
- **Status**: empty_response
- **Error**: Model returned empty response

### Command R+ (`command-r-plus`)
- **Provider**: Cohere
- **Status**: empty_response
- **Error**: Model returned empty response

### Command R (`command-r`)
- **Provider**: Cohere
- **Status**: empty_response
- **Error**: Model returned empty response



## Recommendations

- ✅ **26 models are ready for production use**
- 🔥 **1 models had service errors** - may be temporary, retest later

---

**Report generated by AI Council Model Testing System**