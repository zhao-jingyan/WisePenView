import { Claude, DeepSeek, Doubao, Gemini, Grok, Meta, Mistral, OpenAI } from '@lobehub/icons';
import type { ProviderLogoProps } from './index.type';

function ProviderLogo({ provider, size = 16 }: ProviderLogoProps) {
  const props = { size };
  switch (provider) {
    case 'openai':
      return <OpenAI.Avatar {...props} />;
    case 'anthropic':
      return <Claude.Avatar {...props} />;
    case 'google':
      return <Gemini.Avatar {...props} />;
    case 'meta':
      return <Meta.Avatar {...props} />;
    case 'grok':
      return <Grok.Avatar {...props} />;
    case 'deepseek':
      return <DeepSeek.Avatar {...props} />;
    case 'doubao':
      return <Doubao.Avatar {...props} />;
    case 'mistral':
      return <Mistral.Avatar {...props} />;
    default:
      return <OpenAI.Avatar {...props} />;
  }
}

export default ProviderLogo;
