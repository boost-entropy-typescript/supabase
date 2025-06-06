import { readFile } from 'fs/promises'
import { processMdx } from '../../helpers.mdx.js'
import { BaseLoader, BaseSource } from './base.js'

export class MarkdownLoader extends BaseLoader {
  type = 'markdown' as const

  constructor(
    source: string,
    public filePath: string,
    public options?: { yaml?: boolean }
  ) {
    const path = filePath.replace(/^(pages|content)/, '').replace(/\.mdx?$/, '')
    super(source, path)
  }

  async load() {
    const contents = await readFile(this.filePath, 'utf8')
    return [new MarkdownSource(this.source, this.path, contents, this.options)]
  }
}

export class MarkdownSource extends BaseSource {
  type = 'markdown' as const

  constructor(
    source: string,
    path: string,
    public contents: string,
    public options?: { yaml?: boolean }
  ) {
    super(source, path)
  }

  process() {
    const { checksum, meta, sections } = processMdx(this.contents, this.options)

    this.checksum = checksum
    this.meta = meta
    this.sections = sections

    return { checksum, meta, sections }
  }

  extractIndexedContent(): string {
    const sections = this.sections ?? []
    const sectionText = sections.map(({ content }) => content).join('\n\n')

    return `# ${this.meta?.title ?? ''}\n\n${this.meta?.subtitle ?? ''}\n\n${sectionText}`
  }
}
