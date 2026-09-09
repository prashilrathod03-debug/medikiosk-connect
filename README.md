# MediKiosk Connect

Build MediKiosk, an AI-powered patient self-service kiosk for hospital OPDs. Prioritize and fully implement screens 1–3 first as an end-to-end responsive touchscreen flow: bilingual English/Hindi landing/identify/register and consent, voice + touch chat history intake using browser SpeechRecognition/SpeechSynthesis with mocked POST /api/chat behavior and transcript persistence, then image/PDF document upload with drag/drop/camera support and realistic 2-second mocked OCR POST /api/ocr-extract, processed document cards and abnormal labs highlighted. Use trustworthy white and teal/dark-green medical UI, very large accessible touch targets. Set up Supabase auth/database schema for patients, sessions, documents, summaries as specified, using appropriate mock/fallback behavior if setup needs user input. After 1–3 work, complete the summary/routing flow with mocked /api/generate-summary and a separate /physician dashboard with demo login, editable structured summaries, and approval. Keep UI mobile/tablet responsive.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/734c6c60-929c-449a-99e5-014b810b2604).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
