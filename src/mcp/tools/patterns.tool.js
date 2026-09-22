import { z } from 'zod';
import { findSimilarPatterns } from '../../patterns/pattern.service.js';

export function registerPatternsTools(mcp) {
  mcp.tool('find_similar_patterns',
    {
      keys: z.array(z.string()).describe('List of keywords or service names to match against known problem signatures')
    },
    async ({ keys }) => {
      try {
        const patterns = await findSimilarPatterns(keys);
        return {
          content: [{ type: 'text', text: JSON.stringify(patterns, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
