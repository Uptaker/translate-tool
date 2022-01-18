import type {Dict, Project} from '../common/Project'
import jsonLoader from '../common/JsonLoader'

export class BitBucketClient {
  static host = 'api.bitbucket.org'
  branch = this.config.branch ?? 'translations'
  author = {name: 'Translate Tool', email: 'translate@codeborne.com'}

  constructor(public config: Project) {
    if (!config.url.includes(BitBucketClient.host)) throw new Error('Not a BitBucket url: ' + config.url)
    if (config.branch) this.branch = config.branch
  }

  setAuthorName(name: string) {
    this.author.name = name
  }

  setAuthorEmail(email: string) {
    this.author.email = email
  }

  tokenHeader(token: string | undefined) {
    return token ? {Authorization: 'Bearer ' + token} : undefined
  }

  request(url: string, init?: RequestInit) {
    return jsonLoader.request(url, {...init, headers: {...init?.headers}})
  }

  send(url: string, method: string, body: any) {
    return this.request(url, {method, body, headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
  }

  post(url: string, body: any) {
    return this.send(url, 'POST', body)
  }

  put(url: string, body: any) {
    return this.send(url, 'PUT', body)
  }

  async getAccessToken() {
    const split = this.config.token.split(':')
    const body = 'grant_type=client_credentials&client_id=' + split[0] + '&client_secret=' + split[1]
    return await this.post('https://bitbucket.org/site/oauth2/access_token', body) as BitBucketAuthResponse
  }

  getBranchListUrl() {
    return this.config.url.slice(0, this.config.url.indexOf('/src/')) + '/refs/branches'
  }

  async getFile(file: string, branch?: string) {
    const url = branch ? this.config.url.replace('/main/', `/${branch}/`) : this.config.url
    const token = (this.config.token) ? await this.getAccessToken() : undefined
    return await this.fetchFile(url + file, token?.access_token)
  }

  async fetchFile(url: string, token: string | undefined, init?: RequestInit,) {
    return await this.request(url, {...init, headers: {...this.tokenHeader(token), ...init?.headers}})
  }

  async saveFile(lang: string, dict: Dict, commitMessage: string) {
    const token: BitBucketAuthResponse = await this.getAccessToken()
    await this.createBranchIfNotExists(token.access_token)
    await this.commit(lang, dict, commitMessage, token.access_token)
  }

  async commit(lang: string, dict: Dict, commitMessage: string, token: string) {
    // const form = new FormData()
    // form.append('message', commitMessage)
    // form.append('branch', this.branch)
    // form.append('branch', this.branch)
    // await fetch(this.getBranchListUrl(), {
    //   method: 'POST', body: form,
    //   headers: {
    //     ...this.tokenHeader(token),
    //     ...{'Content-Type': 'multipart/form-data'}
    //   }
    // }).then(res => res.json())
    // TODO finish first thing in the morning and then refactor to not use fetch
  }

  async createBranchIfNotExists(token: string) {
    const branchExists: boolean = await this.checkIfBranchExists(token)
    if (!branchExists) await this.createBranch(token)
  }

  async checkIfBranchExists(token: string): Promise<boolean> {
    const branches = await fetch(this.getBranchListUrl(),{
      method: 'GET',
      headers: {
        ...this.tokenHeader(token)
      }
    }).then(res => res.json()) as BitBucketBranchListResponse
    return !!(branches.values.find((branch) => branch.name === this.branch))
  }

  async createBranch(token: string) {
    console.log('im here')
    const body = JSON.stringify({name: this.branch, target: {hash: 'main'}})
    await fetch(this.getBranchListUrl(), {
      method: 'POST', body,
      headers: {
        ...this.tokenHeader(token),
        ...{'Content-Type': 'application/json'}
      }
    }).then(res => res.json())
  }



}

export interface BitBucketAuthResponse {
  access_token: string,
  expires_in: number,
  refresh_token: string,
  scopes: string,
  token_type: string
}

export interface BitBucketBranchListResponse {
  values: BitBucketBranchValue[]
}

export interface BitBucketBranchValue {
  name: string,
  type: string,
  target: {
    hash: string
  }
}

