// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 可以在这里自定义规则
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修补 bug
        'docs', // 文档
        'style', // 格式（不影响代码运行的变动）
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 测试相关
        'build', // 构建系统或外部依赖变动
        'ci', // 修改 CI 配置、脚本
        'chore', // 其他不修改 src 或测试文件的变动
        'delete', // 删除不再使用的文件
        'revert', // 回退
        'rename', // 重命名
      ],
    ],
  },
};
