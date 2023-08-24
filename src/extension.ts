/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

import * as vscode from 'vscode';
import OpenAIApi from 'openai';
import { createPrompt } from './prompt';

const apiKey = process.env.OPENAI_API_KEY;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "devgpt" is now active!');

  const openai = new OpenAIApi({
    apiKey,
  });

  vscode.window.registerWebviewViewProvider(
    'myExtensionView',
    {
      resolveWebviewView(webviewView) {
        webviewView.webview.options = {
          enableScripts: true,
          localResourceRoots: [context.extensionUri],
        };

        webviewView.webview.html = getWebviewContent(
          webviewView.webview,
          context.extensionUri
        );

        webviewView.webview.onDidReceiveMessage(async (data) => {
          switch (data.type) {
            case 'sendPrompt':
              const editor = vscode.window.activeTextEditor;

              if (editor || data?.value) {
                const selection = editor?.selection;
                const selectedText = editor?.document.getText(selection);
                let searchPrompt = createPrompt(data.value, selectedText);

                webviewView.webview.postMessage({
                  type: 'showInfo',
                  value: 'I am thinking...',
                });

                // Send the text to OpenAI
                const response = await openai.chat.completions.create({
                  messages: [{ role: 'user', content: searchPrompt }],
                  max_tokens: 1000,
                  temperature: 0.6, 
                  frequency_penalty: 0.0,
                  presence_penalty: 0.5,
                  model: 'gpt-4',
                });

                console.log('response', response);
                console.log('response.choices', response.choices);
                const message = response.choices[0].message;

                // close unclosed codeblocks
                // Use a regular expression to find all occurrences of the substring in the string
                const REGEX_CODEBLOCK = new RegExp('```', 'g');
                const matches = message.content?.match(REGEX_CODEBLOCK);
                // Return the number of occurrences of the substring in the message.content, check if even
                const count = matches ? matches.length : 0;
                if (count % 2 !== 0) {
                  //  append ``` to the end to make the last code block complete
                  message.content += '\n```';
                }

                message.content += `\n\n---\n`;

                // add error message if max_tokens reached
                if (response.choices[0].finish_reason === 'length') {
                  message.content += `\n[WARNING] The response was truncated because it reached the maximum number of tokens. You may want to increase the maxTokens setting.\n\n`;
                }
                message.content += `Tokens used: ${response.usage?.total_tokens}`;

                // Send the response back to the webview
                webviewView.webview.postMessage({
                  type: 'showInfo',
                  value: message.content,
                });
              }

              return;
          }
        });
      },
    },
    {
      webviewOptions: { retainContextWhenHidden: true },
    }
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src/scripts', 'main.js')
  );
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <script href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js" integrity="sha512-LhccdVNGe2QMEfI3x4DVV3ckMRe36TfydKss6mJpdHjNFiV07dFpS2xzeZedptKZrwxfICJpez09iNioiSZ3hA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <style>
				.code {
					white-space: pre;
				}
				p {
					padding-top: 0.4rem;
					padding-bottom: 0.4rem;
				}
				/* overrides vscodes style reset, displays as if inside web browser */
				ul, ol {
					list-style: initial !important;
					margin-left: 10px !important;
				}
				h1, h2, h3, h4, h5, h6 {
					font-weight: bold !important;
				}

        /* overrides vscodes style for textareas */
        textarea {
          border-width: 0px;
          font-size: 1em;
          font-family: inherit;
          resize: none;
          padding: 0.5em;
          margin: 0;
          box-sizing: border-box;
        }

        textarea:focus {
          /* outline blue light */
          outline: 1px solid #134aa9;
        }

				</style>
    </head>
    <body>
      <textarea class="h-auto w-full bg-black text-white p-4 text-sm" type="text focus:outline-none focus:ring focus:border-blue-500" id="prompt" placeholder="Enter your prompt" rows="3"></textarea>
      <button id="send_prompt" class="mt-4 h-12 w-full rounded-full bg-green-500 p-4 flex justify-center uppercase">Send Prompt</button>
      <p class="mt-4" id="response"></p>

      <script src="${scriptUri}"></script>
    </body>
    </html>`;
}
