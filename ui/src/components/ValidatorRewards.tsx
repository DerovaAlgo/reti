import { useQuery } from '@tanstack/react-query'
import { getApplicationAddress } from 'algosdk'
import { Validator } from '@/interfaces/validator'
import { fetchAccountBalance } from '@/api/algod'
import { getSimulateStakingPoolClient } from '@/api/clients'
import { AlgoDisplayAmount } from '@/components/AlgoDisplayAmount'
import { TrafficLight } from '@/components/TrafficLight'
import { Indicator } from '@/constants/indicator'
import { calculateValidatorHealth } from '@/utils/contracts'
import { ParamsCache } from '@/utils/paramsCache'

/**
 * Fetches the total excess balances (rewards) of all pools for a given validator.
 * @param {Validator} validator - The validator object.
 * @return {number} - The total balances rounded to the nearest whole ALGO.
 * @throws {Error} - If an error occurs during the fetch.
 */
async function fetchRewardBalances(validator: Validator) {
  try {
    let totalBalances = 0n
    for (const pool of validator.pools) {
      const poolAddress = getApplicationAddress(pool.poolAppId)
      const poolBal = await fetchAccountBalance(poolAddress.toString(), true)
      totalBalances += poolBal
    }
    // Truncate to nearest whole ALGO
    return Math.round((Number(totalBalances) - Number(validator.state.totalAlgoStaked)) / 1e6) * 1e6
  } catch (error) {
    console.error(error)
    return 0
  }
}

async function epochPayoutFetch(validator: Validator) {
  const length = BigInt(validator.config.epochRoundLength)
  const params = await ParamsCache.getSuggestedParams()
  try {
    let oldestRound = 0n
    for (const pool of validator.pools) {
      const poolAddress = getApplicationAddress(pool.poolAppId)
      const poolBal = await fetchAccountBalance(poolAddress.toString(), true)
      if (poolBal > 0) {
        const stakingPoolClient = await getSimulateStakingPoolClient(pool.poolAppId)
        const stakingPoolGS = await stakingPoolClient.appClient.getGlobalState()

        let nextRound: bigint = 0n

        if (stakingPoolGS.lastPayout !== undefined) {
          const payout = BigInt(stakingPoolGS.lastPayout.value)
          nextRound = payout - (payout % length) + length
        }
        if (oldestRound === 0n) {
          oldestRound = nextRound
        } else {
          oldestRound = nextRound < oldestRound ? nextRound : oldestRound
        }
      }
    }
    return BigInt(params.firstValid) - oldestRound
  } catch (error) {
    console.error(error)
    return 0n
  }
}

interface ValidatorRewardsProps {
  validator: Validator
}

export function ValidatorRewards({ validator }: ValidatorRewardsProps) {
  const totalBalancesQuery = useQuery({
    queryKey: ['available-rewards', validator.id],
    queryFn: () => fetchRewardBalances(validator),
    refetchInterval: 30000,
  })

  const epochPayoutsQuery = useQuery({
    queryKey: ['rounds-since-last-payout', validator.id],
    queryFn: () => epochPayoutFetch(validator),
    refetchInterval: 30000,
  })

  const healthStatus = calculateValidatorHealth(epochPayoutsQuery.data)

  const tooltipContent = {
    [Indicator.Normal]: 'Fully operational',
    [Indicator.Watch]: 'Payouts Lagging',
    [Indicator.Warning]: 'Payouts Stopped',
    [Indicator.Error]: 'Rewards not compounding',
  }

  if (totalBalancesQuery.error || totalBalancesQuery.data == undefined) {
    return <span className="text-sm text-red-500">Error fetching balance</span>
  }

  return (
    <>
      <TrafficLight indicator={healthStatus} tooltipContent={tooltipContent} className="mr-2" />
      <AlgoDisplayAmount amount={totalBalancesQuery.data} microalgos />
    </>
  )
}
