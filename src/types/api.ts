/** 标准 API 返回体：code === 0 表示成功 */
export interface ApiResponse<T = unknown> {
    code: number;
    msg: string;
    data: T;
}
