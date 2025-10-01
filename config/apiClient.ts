import axios from 'axios';

export class ApiClient {
  private readonly secretKey = process.env.FLW_SECRET_KEY;

  constructor(private readonly baseUrl: string) {}

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T | null> {
    try {
      const response = await axios.get<T>(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}: `, error);
      // Rethrow so callers can handle the error (and so upstream services
      // don't accidentally receive `null` and return that to clients).
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T | null> {
    try {
      const response = await axios.post<T>(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching ${endpoint}: `, error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T | null> {
    try {
      const response = await axios.put<T>(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status !== 200) {
        throw new Error(`Failed to patch: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}: `, error);
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T | null> {
    try {
      const response = await axios.delete<T>(`${this.baseUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status !== 200) {
        throw new Error(`Failed to patch: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}: `, error);
      throw error;
    }
  }
}
