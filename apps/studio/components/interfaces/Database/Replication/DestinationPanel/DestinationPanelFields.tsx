import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { useParams } from 'common'
import { useIsNewStorageUIEnabled } from 'components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { getCatalogURI } from 'components/interfaces/Storage/StorageSettings/StorageSettings.utils'
import { InlineLink } from 'components/ui/InlineLink'
import { getKeys, useAPIKeysQuery } from 'data/api-keys/api-keys-query'
import { useProjectSettingsV2Query } from 'data/config/project-settings-v2-query'
import { useBucketsQuery } from 'data/storage/buckets-query'
import { useIcebergNamespacesQuery } from 'data/storage/iceberg-namespaces-query'
import { useStorageCredentialsQuery } from 'data/storage/s3-access-key-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import {
  Button,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  Input_Shadcn_,
  Select_Shadcn_,
  SelectContent_Shadcn_,
  SelectGroup_Shadcn_,
  SelectItem_Shadcn_,
  SelectSeparator_Shadcn_,
  SelectTrigger_Shadcn_,
  TextArea_Shadcn_,
  WarningIcon,
} from 'ui'
import { Admonition } from 'ui-patterns'
import { Input } from 'ui-patterns/DataInputs/Input'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { CREATE_NEW_KEY, CREATE_NEW_NAMESPACE } from './DestinationPanel.constants'
import type { DestinationPanelSchemaType } from './DestinationPanel.schema'

export const BigQueryFields = ({ form }: { form: UseFormReturn<DestinationPanelSchemaType> }) => {
  return (
    <>
      <div className="px-5 pt-5">
        <p className="text-sm font-medium text-foreground mb-1">BigQuery settings</p>
        <p className="text-sm text-foreground-light mb-4">
          Configure how data is sent to your BigQuery destination
        </p>
      </div>
      <div className="space-y-4 pb-5">
        <FormField_Shadcn_
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItemLayout
              layout="vertical"
              className="px-5"
              label="Project ID"
              description="The Google Cloud project ID where data will be sent"
            >
              <FormControl_Shadcn_>
                <Input_Shadcn_ {...field} placeholder="my-gcp-project" />
              </FormControl_Shadcn_>
            </FormItemLayout>
          )}
        />

        <FormField_Shadcn_
          control={form.control}
          name="datasetId"
          render={({ field }) => (
            <FormItemLayout
              label="Dataset ID"
              layout="vertical"
              className="px-5"
              description="The BigQuery dataset where replicated tables will be created"
            >
              <FormControl_Shadcn_>
                <Input_Shadcn_ {...field} placeholder="my_dataset" />
              </FormControl_Shadcn_>
            </FormItemLayout>
          )}
        />

        <FormField_Shadcn_
          control={form.control}
          name="serviceAccountKey"
          render={({ field }) => (
            <FormItemLayout
              layout="vertical"
              className="px-5"
              label="Service Account Key"
              description="Service account credentials JSON for authenticating with BigQuery"
            >
              <FormControl_Shadcn_>
                <TextArea_Shadcn_
                  {...field}
                  rows={5}
                  maxLength={5000}
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  className="font-mono text-xs"
                />
              </FormControl_Shadcn_>
            </FormItemLayout>
          )}
        />
      </div>
    </>
  )
}

/**
 * [Joshen] JFYI I'd foresee a possible UX friction point here regarding S3 access key IDs and secret access keys
 * - We'd allow users to select access key IDs via a dropdown here, but require a text input for secret access keys
 * - Chances are most users wouldn't have the corresponding secret access key for the selected key ID at the top of their heads
 * - So highly likely may have to default to "Create a new key" -> which from here they won't know the secret access key thereafter
 * - And it'll end up just creating more keys for each destination
 * Ideal scenario: Just select an access key ID, we then apply the secret access key in the PATCH request, so FE has no
 * context of the secret access key at any point
 */
export const AnalyticsBucketFields = ({
  form,
  setIsFormInteracting,
}: {
  form: UseFormReturn<DestinationPanelSchemaType>
  setIsFormInteracting: (value: boolean) => void
}) => {
  const { warehouseName, type, s3AccessKeyId, namespace } = form.watch()
  const [showCatalogToken, setShowCatalogToken] = useState(false)
  const [showSecretAccessKey, setShowSecretAccessKey] = useState(false)

  const { ref: projectRef } = useParams()
  const isStorageV2 = useIsNewStorageUIEnabled()
  const { data: project } = useSelectedProjectQuery()

  const { data: apiKeys } = useAPIKeysQuery({ projectRef, reveal: true })
  const { serviceKey } = getKeys(apiKeys)
  const serviceApiKey = serviceKey?.api_key ?? ''

  const { data: projectSettings } = useProjectSettingsV2Query({ projectRef })

  const {
    data: keysData,
    isSuccess: isSuccessKeys,
    isLoading: isLoadingKeys,
    isError: isErrorKeys,
  } = useStorageCredentialsQuery({ projectRef })
  const s3Keys = keysData?.data ?? []
  const keyNoLongerExists =
    (s3AccessKeyId ?? '').length > 0 &&
    s3AccessKeyId !== CREATE_NEW_KEY &&
    !s3Keys.find((k) => k.access_key === s3AccessKeyId)

  const {
    data: buckets = [],
    isLoading: isLoadingBuckets,
    isError: isErrorBuckets,
  } = useBucketsQuery({ projectRef })
  const analyticsBuckets = buckets.filter((bucket) => bucket.type === 'ANALYTICS')

  // Construct catalog URI for iceberg namespaces query
  const catalogUri = useMemo(() => {
    if (!project?.ref || !projectSettings) return ''
    const protocol = projectSettings.app_config?.protocol ?? 'https'
    const endpoint =
      projectSettings.app_config?.storage_endpoint || projectSettings.app_config?.endpoint
    return getCatalogURI(project.ref, protocol, endpoint)
  }, [project?.ref, projectSettings])

  const canSelectNamespace = !!warehouseName && !!serviceApiKey

  const {
    data: namespaces = [],
    isLoading: isLoadingNamespaces,
    isError: isErrorNamespaces,
    refetch: refetchNamespaces,
  } = useIcebergNamespacesQuery(
    {
      catalogUri,
      warehouse: warehouseName || '',
      token: serviceApiKey || '',
    },
    {
      enabled: type === 'Analytics Bucket' && !!catalogUri && !!warehouseName && !!serviceApiKey,
    }
  )

  return (
    <>
      <div className="px-5 pt-5">
        <p className="text-sm font-medium text-foreground mb-1">Analytics Bucket settings</p>
        <p className="text-sm text-foreground-light mb-4">
          Configure how data is sent to your Analytics Bucket destination
        </p>
      </div>
      <div className="space-y-4 pb-5">
        <FormField_Shadcn_
          control={form.control}
          name="warehouseName"
          render={({ field }) => (
            <FormItemLayout
              label="Bucket"
              layout="vertical"
              className="px-5"
              description="The Analytics Bucket where data will be stored"
            >
              {isLoadingBuckets ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-between"
                  size="small"
                  iconRight={<Loader2 className="animate-spin" />}
                >
                  Retrieving buckets
                </Button>
              ) : isErrorBuckets ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-start"
                  size="small"
                  icon={<WarningIcon />}
                >
                  Failed to retrieve buckets
                </Button>
              ) : (
                <FormControl_Shadcn_>
                  <Select_Shadcn_
                    value={field.value}
                    onValueChange={(value) => {
                      setIsFormInteracting(true)
                      field.onChange(value)
                      // [Joshen] Ideally should select the first namespace of the selected bucket
                      form.setValue('namespace', '')
                    }}
                  >
                    <SelectTrigger_Shadcn_>
                      {field.value || 'Select a bucket'}
                    </SelectTrigger_Shadcn_>
                    <SelectContent_Shadcn_>
                      <SelectGroup_Shadcn_>
                        {analyticsBuckets.length === 0 ? (
                          <SelectItem_Shadcn_ value="__no_buckets__" disabled>
                            No buckets available
                          </SelectItem_Shadcn_>
                        ) : (
                          analyticsBuckets.map((bucket) => (
                            <SelectItem_Shadcn_ key={bucket.id} value={bucket.name}>
                              {bucket.name}
                            </SelectItem_Shadcn_>
                          ))
                        )}
                      </SelectGroup_Shadcn_>
                    </SelectContent_Shadcn_>
                  </Select_Shadcn_>
                </FormControl_Shadcn_>
              )}
            </FormItemLayout>
          )}
        />

        <FormField_Shadcn_
          control={form.control}
          name="namespace"
          render={({ field }) => (
            <FormItemLayout
              label="Namespace"
              layout="vertical"
              className="px-5"
              description="The namespace within the bucket where tables will be organized"
            >
              {isLoadingNamespaces && canSelectNamespace ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-between"
                  size="small"
                  iconRight={<Loader2 className="animate-spin" />}
                >
                  Retrieving namespaces
                </Button>
              ) : isErrorNamespaces ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-start"
                  size="small"
                  icon={<WarningIcon />}
                >
                  Failed to retrieve namespaces
                </Button>
              ) : (
                <FormControl_Shadcn_>
                  <Select_Shadcn_
                    value={field.value}
                    onValueChange={(value) => {
                      setIsFormInteracting(true)
                      field.onChange(value)
                    }}
                    disabled={!canSelectNamespace}
                  >
                    <SelectTrigger_Shadcn_>
                      {!canSelectNamespace
                        ? 'Select a warehouse first'
                        : field.value === CREATE_NEW_NAMESPACE
                          ? 'Create a new namespace'
                          : field.value || 'Select a namespace'}
                    </SelectTrigger_Shadcn_>
                    <SelectContent_Shadcn_>
                      <SelectGroup_Shadcn_>
                        {namespaces.length === 0 ? (
                          <SelectItem_Shadcn_ value="__no_namespaces__" disabled>
                            No namespaces available
                          </SelectItem_Shadcn_>
                        ) : (
                          namespaces.map((namespace) => (
                            <SelectItem_Shadcn_ key={namespace} value={namespace}>
                              {namespace}
                            </SelectItem_Shadcn_>
                          ))
                        )}
                        {namespaces.length > 0 && <SelectSeparator_Shadcn_ />}
                        <SelectItem_Shadcn_ key={CREATE_NEW_NAMESPACE} value={CREATE_NEW_NAMESPACE}>
                          Create a new namespace
                        </SelectItem_Shadcn_>
                      </SelectGroup_Shadcn_>
                    </SelectContent_Shadcn_>
                  </Select_Shadcn_>
                </FormControl_Shadcn_>
              )}
            </FormItemLayout>
          )}
        />

        {namespace === CREATE_NEW_NAMESPACE && (
          <FormField_Shadcn_
            control={form.control}
            name="newNamespaceName"
            render={({ field }) => (
              <FormItemLayout
                label="New Namespace Name"
                layout="vertical"
                className="px-5"
                description="A unique name for the new namespace"
              >
                <FormControl_Shadcn_>
                  <Input_Shadcn_ {...field} placeholder="new_namespace" value={field.value || ''} />
                </FormControl_Shadcn_>
              </FormItemLayout>
            )}
          />
        )}

        <FormField_Shadcn_
          control={form.control}
          name="catalogToken"
          render={({ field }) => (
            <FormItemLayout
              layout="vertical"
              label="Catalog Token"
              className="px-5"
              description={
                <>
                  Automatically retrieved from your project's{' '}
                  <InlineLink href={`/project/${projectRef}/settings/api-keys`}>
                    service role key
                  </InlineLink>
                </>
              }
            >
              <Input
                disabled
                value={field.value}
                type={showCatalogToken ? 'text' : 'password'}
                placeholder="Auto-populated"
                actions={
                  serviceApiKey ? (
                    <div className="flex items-center justify-center">
                      <Button
                        type="default"
                        className="w-7"
                        icon={showCatalogToken ? <Eye /> : <EyeOff />}
                        onClick={() => setShowCatalogToken(!showCatalogToken)}
                      />
                    </div>
                  ) : null
                }
              />
            </FormItemLayout>
          )}
        />

        <FormField_Shadcn_
          control={form.control}
          name="s3AccessKeyId"
          render={({ field }) => (
            <FormItemLayout layout="vertical" label="S3 Access Key ID" className="px-5">
              {isLoadingKeys ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-between"
                  size="small"
                  iconRight={<Loader2 className="animate-spin" />}
                >
                  Retrieving keys
                </Button>
              ) : isErrorKeys ? (
                <Button
                  disabled
                  type="default"
                  className="w-full justify-start"
                  size="small"
                  icon={<WarningIcon />}
                >
                  Failed to retrieve keys
                </Button>
              ) : (
                <FormControl_Shadcn_>
                  <Select_Shadcn_ value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger_Shadcn_>
                      {field.value === CREATE_NEW_KEY
                        ? 'Create a new key'
                        : (field.value ?? '').length === 0
                          ? 'Select an access key ID'
                          : field.value}
                    </SelectTrigger_Shadcn_>
                    <SelectContent_Shadcn_>
                      <SelectGroup_Shadcn_>
                        {s3Keys.map((key) => (
                          <SelectItem_Shadcn_ key={key.id} value={key.access_key}>
                            {key.access_key}
                            <p className="text-foreground-lighter">{key.description}</p>
                          </SelectItem_Shadcn_>
                        ))}
                        <SelectSeparator_Shadcn_ />
                        <SelectItem_Shadcn_ key={CREATE_NEW_KEY} value={CREATE_NEW_KEY}>
                          Create a new key
                        </SelectItem_Shadcn_>
                      </SelectGroup_Shadcn_>
                    </SelectContent_Shadcn_>
                  </Select_Shadcn_>
                </FormControl_Shadcn_>
              )}
            </FormItemLayout>
          )}
        />

        {isSuccessKeys && keyNoLongerExists && (
          <div className="px-5">
            <Admonition type="warning" title="Unable to find access key ID in project">
              <p className="!leading-normal">
                Please select another key or create a new set, as this destination will not work
                otherwise. S3 access keys can be managed in your{' '}
                <InlineLink
                  href={
                    isStorageV2
                      ? `/project/${projectRef}/storage/files/settings`
                      : `/project/${projectRef}/storage/settings`
                  }
                >
                  storage settings
                </InlineLink>
              </p>
            </Admonition>
          </div>
        )}

        {s3AccessKeyId === CREATE_NEW_KEY ? (
          <div className="px-5">
            <Admonition type="default" title="A new set of S3 access keys will be created">
              <p className="!leading-normal">
                S3 access keys can be managed in your{' '}
                <InlineLink
                  href={
                    isStorageV2
                      ? `/project/${projectRef}/storage/files/settings`
                      : `/project/${projectRef}/storage/settings`
                  }
                >
                  storage settings
                </InlineLink>
                .
              </p>
            </Admonition>
          </div>
        ) : (
          <FormField_Shadcn_
            control={form.control}
            name="s3SecretAccessKey"
            render={({ field }) => (
              <FormItemLayout
                layout="vertical"
                label="S3 Secret Access Key"
                className="relative px-5"
                description="The secret key corresponding to your selected access key ID"
              >
                <FormControl_Shadcn_>
                  <Input_Shadcn_
                    {...field}
                    type={showSecretAccessKey ? 'text' : 'password'}
                    value={field.value ?? ''}
                  />
                </FormControl_Shadcn_>
                <Button
                  type="default"
                  icon={showSecretAccessKey ? <Eye /> : <EyeOff />}
                  className="w-7 absolute right-6 top-[33px]"
                  onClick={() => setShowSecretAccessKey(!showSecretAccessKey)}
                />
              </FormItemLayout>
            )}
          />
        )}
      </div>
    </>
  )
}
