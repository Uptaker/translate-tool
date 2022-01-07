import type {Dict, Project} from '../common/Project'
import {decodeBase64Unicode, encodeBase64Unicode} from '../common/utils'
import jsonLoader from '../common/JsonLoader'
import {LoadedProject} from '../common/Project'
import {cleanEmptyKeys} from '../editor/cleanEmptyKeys'

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

  getFile(file: string, branch?: string) {
    return this.request(this.config.url + file + (branch ? '?ref=' + branch : '')) as Promise<GitHubFile>
  }

  async getFileContent(file: string) {
    const response = await this.getFile(file, this.branch).catch(() => this.getFile(file))
    if (response.encoding === 'base64') return JSON.parse(decodeBase64Unicode(response.content))
    else response.content
  }

  async createPullRequest(title: string) {
    this.send(this.getPullsUrl(), 'POST', {base: 'master', head: this.branch, title})
  }

  async checkIfPullRequestExists() {
    return this.request(this.getPullsUrl())
  }

  getPullsUrl() {
    return this.config.url.substring(0, this.config.url.lastIndexOf('/content')) + '/pulls'
  }

  async saveFile(lang: string, dict: Dict, commitMessage: string) {
    await this.createBranchIfNeeded()
    const fileName = lang + '.json'
    const content = encodeBase64Unicode(LoadedProject.prettyFormat(cleanEmptyKeys(dict), this.config.indent))
    const previousFileBlobSha = (await this.getFile(fileName + '?ref=' + this.branch)).sha // TODO: store initial loaded file(blob) sha in LoadedProject
    const result = await this.put(this.config.url + fileName, {
      message: commitMessage,
      sha: previousFileBlobSha,
      branch: this.branch,
      content,
      author: {name: 'Translate Tool', email: 'translate@codeborne.com'}
    }) as GitHubSavedFile
      !(await this.checkIfPullRequestExists()).length && await this.createPullRequest('Updated translations')
    return result
  }

  private async createBranchIfNeeded() {
    const refsUrl = this.config.url.replace(/contents\/.*$/, 'git/refs')
    const refs = await this.request(refsUrl) as GitHubRef[]

    let branchSha = refs.find(r => r.ref == 'refs/heads/' + this.branch)?.object.sha
    if (!branchSha) {
      branchSha = refs[0].object.sha
      await this.post(refsUrl, {ref: 'refs/heads/' + this.branch, sha: branchSha})
      // TODO: create a PR here
      // this.createPullRequest gets error as response when doing it here: "No commits between master and translations"
      // also upon creating a request "A pull request already exists for paywerk:translations"
    }
  }
}

export interface GitHubFile {
  content: string,
  encoding: string,
  sha: string
}

export interface GitHubSavedFile {
  content: {name: string, path: string, sha: string, html_url: string}
  commit: {sha: string, html_url: string}
}

export interface GitHubRef {
  ref: string,
  url: string
  object: {
    type: string,
    sha: string,
    url: string
  }
}