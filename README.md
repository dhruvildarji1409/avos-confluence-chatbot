# AVOS Confluence Chatbot

A Next.js application that allows users to parse and search Confluence documentation and ask questions about AVOS.

## Features

- Beautiful and modern UI built with Tailwind CSS
- Import Confluence pages via URL
- Store Confluence content in MongoDB for quick retrieval
- Chat interface with markdown and code highlighting support
- Session management for conversation history
- Responsive design for desktop and mobile use

## Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Parsing**: Cheerio for HTML parsing
- **Markdown**: React-Markdown for rendering markdown and code blocks
- **Styling**: TailwindCSS for responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Confluence API credentials

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/avos-bot.git
   cd avos-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the project root with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/avos-bot-confluence-data
   CONFLUENCE_BASE_URL=https://your-confluence-instance.com/rest/api/content
   CONFLUENCE_USERNAME=your_username
   CONFLUENCE_PASSWORD=your_password
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secure_secret
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Import Confluence Pages**
   - Enter a Confluence URL in the importer panel
   - The system will parse and store the content in MongoDB

2. **Chat with the Bot**
   - Ask questions about AVOS in the chat interface
   - The bot will search the database for relevant information
   - Responses include source attribution

3. **View Code Snippets**
   - Code snippets from documentation are properly formatted and syntax highlighted

## Deployment

This application can be deployed on Vercel, Netlify, or any other Next.js-compatible hosting platform.

```bash
npm run build
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgements

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- MongoDB for the flexible document database 