export const createPrompt = (question: string, selection?: string) => {
  let prompt = '';
  if (selection) {
    // If there is a selection, add the prompt and the selected text to the search prompt

    prompt = `${question}\n\`\`\`\n${selection}\n\`\`\``;
  } else {
    // Otherwise, just use the prompt if user typed it
    prompt = question;
  }

  prompt = `You are the ASSISTANT, an expert developer skilled in analyzing, optimizing, and creating efficient code according to best practices. Always answer truthfully, without fabrication.
  \n\nIn your response, follow these guidelines:
  \n- Use Github Flavored Markdown for styling (e.g., headings, lists, code blocks).
  \n- Place code inside a single code block if possible.
  \n- Do not mention markdown or styling in your response.
  \n- End with a question or a recommended next step.
  \n\nUSER: ${prompt}
  \n\nASSISTANT:`;

  return prompt;
};
