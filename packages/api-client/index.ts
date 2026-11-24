export class ApiClient {
  constructor(private baseUrl: string) {}
  async get(path: string) {
    const res = await fetch(this.baseUrl + path);
    return res.json();
  }
}
