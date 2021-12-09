import type {Dict, Project} from '../common/Project'
import {b64DecodeUnicode} from '../common/utils'
import jsonLoader from '../common/JsonLoader'

export class GitHubClient {
  static host = 'api.github.com'
  branch = 'translations'
  constructor(public config: Project) {
    if (!config.url.includes(GitHubClient.host)) throw new Error('Not a GitHub url: ' + config.url)
  }

  authHeader() {
    return this.config.token ? {Authorization: 'token ' + this.config.token} : undefined
  }

  request(url: string, init?: RequestInit) {
    return jsonLoader.request(url, {...init, headers: {...this.authHeader(), ...init?.headers}})
  }

  send(url: string, method: string, body: any) {
    return this.request(url, {method, body: JSON.stringify(body), headers: {'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json'}})
  }

  post(url: string, body: any) {
    return this.send(url, 'POST', body)
  }

  put(url: string, body: any) {
    return this.send(url, 'PUT', body)
  }

  getFileData(url: string, branch?: string) {
    return this.request(url + (branch ? '?ref=' + branch : '')) as Promise<GitHubFile>
  }

  async getFileContent(url: string) {
    const response = await this.getFileData(url)
    if (response.encoding === 'base64') return JSON.parse(b64DecodeUnicode(response.content))
    else response.content
  }

  async saveFile(lang: string, dict: Dict) {
    await this.createBranchIfNeeded()
    const fileUrl = this.config.url + lang + '.json'
    const content = btoa(JSON.stringify(dict, null, this.config.indent)) // TODO: move stringify logic to a common place
    const previousFileBlobSha = (await this.getFileData(fileUrl + '?ref=' + this.branch)).sha // TODO: store initial file sha in LoadedProject
    return await this.put(fileUrl, {
      message: `Updated ${lang} translations`,
      sha: previousFileBlobSha,
      branch: this.branch,
      content,
      author: {name: 'Translate Tool', email: 'translate@codeborne.com'}
    }) as GitHubSavedFile
  }

  private async createBranchIfNeeded() {
    const refsUrl = this.config.url.replace(/contents\/.*$/, 'git/refs')
    const refs = await this.request(refsUrl) as GitHubRef[]

    let branchSha = refs.find(r => r.ref == 'refs/heads/' + this.branch)?.object.sha
    if (!branchSha) {
      branchSha = refs[0].object.sha
      await this.post(refsUrl, {ref: 'refs/heads/' + this.branch, sha: branchSha})
      // TODO: create a PR here
    }
  }
}

interface GitHubFile {
  content: string,
  encoding: string,
  sha: string
}

interface GitHubSavedFile {
  content: {name: string, path: string, sha: string, html_url: string}
  commit: {sha: string, html_url: string}
}

interface GitHubRef {
  ref: string,
  url: string
  object: {
    type: string,
    sha: string,
    url: string
  }
}
