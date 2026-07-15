import type { IUserService } from '@/domains/User';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { computeFileMd5 } from '@/utils/oss/computeFileMd5';
import { putOssPresignedUrl } from '@/utils/oss/ossPresignedPut';
import { AgentApi } from '../apis/AgentApi';
import { AgentServicesMap } from '../mapper/AgentServices.map';
import type { IAgentService } from './index.type';

interface AgentServicesDeps {
  userService: IUserService;
}

const resolveAssetType = (name: string): string => {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'md') return 'MD';
  if (extension === 'py') return 'PYTHON_SCRIPT';
  if (extension === 'json') return 'JSON';
  if (extension === 'yaml' || extension === 'yml') return 'YAML';
  if (extension === 'toml') return 'TOML';
  return 'TEXT';
};

export const createAgentServices = ({ userService }: AgentServicesDeps): IAgentService => ({
  async createAgent(title, name, description) {
    const resourceId = await AgentApi.createAgent({ title, name, description });
    if (!resourceId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.AGENT_CREATE_RESOURCE_ID_MISSING);
    }
    return resourceId;
  },
  async getAgentDetail(resourceId, version) {
    const [user, info] = await Promise.all([
      userService.getUserInfo(),
      AgentApi.getAgentInfo(resourceId),
    ]);
    const publishedVersion = info?.agentInfo?.version ?? 0;
    const targetVersion =
      version ??
      (info?.resourceInfo?.ownerId === user.id ? publishedVersion + 1 : publishedVersion);
    const bundle =
      targetVersion > 0
        ? await AgentApi.getAgentVersionBundleInfo(resourceId, targetVersion)
        : undefined;
    return AgentServicesMap.mapAgentDetail({ resourceId, info, bundle, currentUserId: user.id });
  },
  async updateAgentInfo(resourceId, name, description) {
    await AgentApi.changeAgentInfo({ resourceId, name, description });
  },
  async updateAgentSpec(resourceId, draftVersion, spec) {
    await AgentApi.updateAgentSpec({ resourceId, draftVersion, spec });
  },
  async publishVersion(resourceId) {
    await AgentApi.publishAgentVersion(resourceId);
  },
  async uploadAsset(resourceId, draftVersion, { file, path = '/' }) {
    const response = await AgentApi.initUploadAgentAssets({
      resourceId,
      draftVersion,
      assets: [
        {
          name: file.name,
          path,
          assetResourceType: resolveAssetType(file.name),
          md5: await computeFileMd5(file),
          expectedSize: file.size,
        },
      ],
    });
    const ticket = response?.assetUploadTickets?.[0];
    if (!ticket?.assetId) {
      throw createClientError(FRONTEND_CLIENT_ERROR.AGENT_UPLOAD_ASSET_ID_MISSING);
    }
    if (ticket.putUrl && ticket.callbackHeader) {
      await putOssPresignedUrl({
        putUrl: ticket.putUrl,
        callbackHeader: ticket.callbackHeader,
        body: file,
      });
    }
  },
  async deleteAssets(resourceId, draftVersion, assetIds) {
    if (assetIds.length === 0) return;
    await AgentApi.deleteAgentAssets({ resourceId, draftVersion, assetIds });
  },
});
