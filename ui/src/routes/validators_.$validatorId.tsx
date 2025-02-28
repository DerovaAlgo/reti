import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ErrorComponent, createFileRoute } from '@tanstack/react-router'
import { useWallet } from '@txnlab/use-wallet-react'
import { ValidatorNotFoundError } from '@/api/contracts'
import { constraintsQueryOptions, stakesQueryOptions, validatorQueryOptions } from '@/api/queries'
import { Loading } from '@/components/Loading'
import { Meta } from '@/components/Meta'
import { PageMain } from '@/components/PageMain'
import { ValidatorDetails } from '@/components/ValidatorDetails'
import { DetailsHeader } from '@/components/ValidatorDetails/DetailsHeader'

export const Route = createFileRoute('/validators_/$validatorId')({
  beforeLoad: () => {
    return {
      validatorQueryOptions,
    }
  },
  loader: ({ context: { queryClient, validatorQueryOptions }, params: { validatorId } }) => {
    queryClient.ensureQueryData(validatorQueryOptions(validatorId))
  },
  component: Dashboard,
  pendingComponent: () => <Loading size="lg" className="opacity-50" />,
  errorComponent: ({ error }) => {
    if (error instanceof ValidatorNotFoundError) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
})

function Dashboard() {
  const { validatorId } = Route.useParams()
  const validatorQuery = useSuspenseQuery(validatorQueryOptions(validatorId))
  const validator = validatorQuery.data

  const constraintsQuery = useSuspenseQuery(constraintsQueryOptions)
  const constraints = constraintsQuery.data

  const { activeAddress } = useWallet()

  const stakesQuery = useQuery(stakesQueryOptions(activeAddress))
  const stakesByValidator = stakesQuery.data || []

  const pageTitle = validator.nfd ? validator.nfd.name : `Validator ${validator.id}`

  return (
    <>
      <Meta title={pageTitle} />
      <DetailsHeader validator={validator} />
      <PageMain>
        <ValidatorDetails
          validator={validator}
          constraints={constraints}
          stakesByValidator={stakesByValidator}
        />
      </PageMain>
    </>
  )
}
