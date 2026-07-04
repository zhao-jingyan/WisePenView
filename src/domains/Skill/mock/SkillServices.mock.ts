import type { ISkillService } from '../service/index.type';

const mockDetail = {
  resourceId: 'mock-skill',
  title: 'Mock Skill',
  skillName: 'mock_skill',
  description: '',
  version: 0,
  draftVersion: 1,
  status: 'DRAFT' as const,
  updatedAt: '',
  creatorId: 'mock-user',
  scopeType: 'PERSONAL' as const,
  fileCount: 1,
  isOwner: true,
  files: [
    {
      id: 'mock-skill-md',
      name: 'SKILL.md',
      path: '/',
      kind: 'file' as const,
      language: 'markdown',
      content: '# Mock Skill\n',
    },
  ],
};

export const SkillServicesMock: ISkillService = {
  getSkillSummaries: async () => [mockDetail],
  createSkill: async () => mockDetail.resourceId,
  getSkillDetail: async () => mockDetail,
  getSkillVersionFiles: async () => mockDetail,
  updateSkillInfo: async () => undefined,
  publishVersion: async () => undefined,
  deleteAssets: async () => undefined,
  uploadAsset: async () => undefined,
  saveAsset: async () => undefined,
};
