/**
 * Latex 批注对外入口：仅 re-export 编辑器批注模块实际引用的符号。
 * 其余实现请从相对路径直接导入。
 */
export { LatexCommentProvider } from './latexCommentContext';
export { useFormulaComments } from './useFormulaComments';
