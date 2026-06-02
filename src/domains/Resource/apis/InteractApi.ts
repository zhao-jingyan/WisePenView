import { apiPost } from '@/apis/request';
import type {
  RateApiRequest,
  RateApiResponse,
  ToggleLikeApiRequest,
  ToggleLikeApiResponse,
} from './InteractApi.type';

/** /resource/interact/* 子路由 API */
function toggleLike(req: ToggleLikeApiRequest): Promise<ToggleLikeApiResponse> {
  return apiPost('/resource/interact/toggleLike', req);
}

function rate(req: RateApiRequest): Promise<RateApiResponse> {
  return apiPost('/resource/interact/rate', req);
}

export const ResourceInteractApi = { toggleLike, rate };
