import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extract variables from template text (e.g., {{variable_name}})
export function extractVariables(template: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(template)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

// Replace variables in template with actual values
export function substituteVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

// Extract variables from dataset items
export function extractDatasetVariables(items: Array<{ data: Record<string, any> }>): string[] {
  const allKeys = new Set<string>();
  
  items.forEach(item => {
    Object.keys(item.data).forEach(key => {
      allKeys.add(key);
    });
  });
  
  return Array.from(allKeys).sort();
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate a random commit-like hash
export function generateCommitHash(length: number = 7): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Validate JSON string
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Parse tags from string array
export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Convert messages to OpenAI format
export function formatMessagesForOpenAI(template: string): Array<{role: string, content: string}> {
  // Simple implementation - can be enhanced to parse different message formats
  return [
    {
      role: 'user',
      content: template
    }
  ];
}

// Convert messages to Anthropic format  
export function formatMessagesForAnthropic(template: string): Array<{role: string, content: string}> {
  // Simple implementation - can be enhanced to parse different message formats
  return [
    {
      role: 'user', 
      content: template
    }
  ];
}