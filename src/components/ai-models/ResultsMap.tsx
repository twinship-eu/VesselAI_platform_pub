'use client'

import dynamic from 'next/dynamic'
import { Box, Text, useColorModeValue } from '@chakra-ui/react'

const LeafletMap = dynamic(
  () => import('./ResultsLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <Box h="420px" w="100%" borderRadius="lg" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.500">Loading map…</Text>
      </Box>
    ),
  }
)

type InputPoint = {
  lat: number
  lon: number
}

type Prediction = {
  next_lat: number
  next_lon: number
}

type Props = {
  inputPoints: InputPoint[]
  prediction: Prediction
}

export function ResultsMap({ inputPoints, prediction }: Props) {
  if (!prediction || !inputPoints?.length) {
    return <Text>No map data available</Text>
  }

  return (
    <LeafletMap
      inputPoints={inputPoints}
      prediction={prediction}
    />
  )
}
