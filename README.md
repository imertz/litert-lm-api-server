# LiteRT-LM OpenAI API Server

🚀 A lightweight Node.js server that provides an OpenAI-compatible API for Google's LiteRT-LM (formerly TensorFlow Lite LLM Runtime), enabling you to run local language models with any OpenAI SDK client.

## ✨ Features

- **OpenAI API Compatibility**: Drop-in replacement for OpenAI's chat completion API
- **Local LLM Inference**: Run language models on your own hardware
- **Multiple Model Support**: Works with any LiteRT-LM compatible model
- **Streaming Support**: Real-time token streaming for better UX
- **Simple Setup**: Interactive setup wizard and automatic configuration
- **Lightweight**: Minimal dependencies, fast startup
- **Cross-Platform**: Works on macOS, Linux, and Windows (with WSL)

## 📋 Prerequisites

- Node.js 18+ and npm
- [LiteRT-LM binary](https://github.com/google-ai-edge/litert) (`litert_lm_main`)
- A compatible `.litertlm` model file (e.g., Gemma models)
- Basic familiarity with command line

## 🚀 Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/litert-lm-api-server.git
cd litert-lm-api-server
```

2. Install dependencies:

```bash
npm install
```

3. Run the interactive setup:

```bash
npm run setup
```

4. Start the server:

```bash
npm start
```

5. Test the API:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-litert-demo-key" \
  -d '{
    "model": "litert-lm",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🔧 Manual Setup

If you prefer manual configuration:

1. Create a `.env` file:

```env
PORT=3000
LITERT_BINARY=./litert_lm_main
MODEL_PATH=gemma-3n-e4b-it-int4.litertlm
BACKEND=cpu
API_KEY=sk-litert-demo-key
```

2. Ensure your LiteRT-LM binary is executable:

```bash
chmod +x ./litert_lm_main
```

3. Start the server:

```bash
npm start
```

## 📖 Usage Examples

### Using with OpenAI SDK (JavaScript/TypeScript)

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "sk-litert-demo-key",
});

const completion = await openai.chat.completions.create({
  model: "litert-lm",
  messages: [
    { role: "user", content: "Explain quantum computing in simple terms" },
  ],
});

console.log(completion.choices[0].message.content);
```

### Using with Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-litert-demo-key"
)

completion = client.chat.completions.create(
    model="litert-lm",
    messages=[
        {"role": "user", "content": "Write a haiku about programming"}
    ]
)

print(completion.choices[0].message.content)
```

### Streaming Responses

```javascript
const stream = await openai.chat.completions.create({
  model: "litert-lm",
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

## 🔌 API Endpoints

### Chat Completions

- **POST** `/v1/chat/completions` - Create a chat completion
- **POST** `/v1/completions` - Create a completion (legacy format)

### Utility Endpoints

- **GET** `/v1/models` - List available models
- **GET** `/health` - Health check endpoint
- **GET** `/health?test=true` - Health check with binary test

## ⚙️ Configuration

All configuration can be done via environment variables:

| Variable        | Description                   | Default                         |
| --------------- | ----------------------------- | ------------------------------- |
| `PORT`          | Server port                   | `3000`                          |
| `LITERT_BINARY` | Path to litert_lm_main binary | `./litert_lm_main`              |
| `MODEL_PATH`    | Path to .litertlm model file  | `gemma-3n-e4b-it-int4.litertlm` |
| `BACKEND`       | Compute backend (cpu/gpu/npu) | `cpu`                           |
| `API_KEY`       | API authentication key        | `sk-litert-demo-key`            |
| `DEBUG`         | Enable debug logging          | `false`                         |

## 🛠️ Advanced Usage

### Using Different Models

The server works with any LiteRT-LM compatible model. To use a different model:

```bash
MODEL_PATH=path/to/your-model.litertlm npm start
```

### GPU Acceleration

If you have a compatible GPU:

```bash
BACKEND=gpu npm start
```

### Custom Port and Authentication

```bash
PORT=8080 API_KEY=your-secret-key npm start
```

## 🐛 Troubleshooting

### Common Issues

1. **"Binary not found"**

   - Ensure the binary path is correct
   - Make it executable: `chmod +x ./litert_lm_main`

2. **"Model not found"**

   - Check the model path in your .env file
   - Ensure the .litertlm file exists

3. **macOS Security Warning**

   - Go to System Settings > Privacy & Security
   - Click "Allow Anyway" for the litert_lm_main binary

4. **No Response Generated**
   - Enable debug mode: `DEBUG=true npm start`
   - Check the raw output from LiteRT-LM

### Debug Mode

For detailed logging:

```bash
DEBUG=true npm start
```

### Testing LiteRT-LM Installation

```bash
npm run test:litert
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google AI Edge team for [LiteRT-LM](https://github.com/google-ai-edge/litert)
- OpenAI for the API specification
- The open-source community for inspiration and support

## 🔗 Links

- [LiteRT Documentation](https://ai.google.dev/edge/litert)
- [Available Models](https://kaggle.com/models/google/gemma)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

## 📊 Project Status

This project is actively maintained. If you encounter any issues or have suggestions, please open an issue on GitHub.
