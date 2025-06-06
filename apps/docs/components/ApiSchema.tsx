import { sample } from '@har-sdk/openapi-sampler'

import { CodeBlock } from '~/features/ui/CodeBlock/CodeBlock'
import { Tabs, TabPanel } from '~/features/ui/Tabs'

type IParamProps = any

const ApiSchema = ({ schema, id }: IParamProps) => {
  let example: string | undefined
  try {
    example = sample(schema, { skipReadOnly: true, quiet: true })
  } catch {
    example = undefined
  }
  return (
    <Tabs
      scrollable
      size="small"
      type="underlined"
      defaultActiveId={example ? 'example' : 'schema'}
    >
      {example && (
        <TabPanel key={`${id ?? ''}-example`} id="example" label="example">
          <div className="mt-8">
            <CodeBlock lang="bash">{JSON.stringify(example, null, 2)}</CodeBlock>
          </div>
        </TabPanel>
      )}
      <TabPanel key={`${id ?? ''}-schema`} id="schema" label="schema">
        <div className="mt-8">
          <CodeBlock lang="bash">{JSON.stringify(schema, null, 2)}</CodeBlock>
        </div>
      </TabPanel>
    </Tabs>
  )
}

export default ApiSchema
