type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 phút — dữ liệu khoa/ngành/lớp gần như không đổi

/**
 * Cache tạm thời trong bộ nhớ (TTL) cho các danh sách combobox ít thay đổi
 * (khoa, ngành, lớp, năm học). Tránh round-trip tới Supabase mỗi lần mở form.
 *
 * Lưu ý: cache chỉ tồn tại trong phạm vi 1 instance ứng dụng, không đồng bộ
 * giữa nhiều instance khi scale ngang — chấp nhận được vì độ trễ tối đa chỉ
 * bằng TTL và dữ liệu nguồn gần như không thay đổi.
 */
export class MetadataCacheHelper {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /**
   * Lấy dữ liệu từ cache nếu còn hạn; nếu hết hạn hoặc chưa có, gọi `loader`
   * để truy vấn lại và lưu vào cache trước khi trả về.
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = this.store.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const data = await loader();
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }
}
