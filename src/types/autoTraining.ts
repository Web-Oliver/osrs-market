export interface AutoTrainingConfig {
  dataCollection: {
    enableAutoCollection: boolean
    collectionInterval: number
    maxItemsPerCollection: number
    enableHistoricalData: boolean
  }
  neuralNetwork: {
    inputSize: number
    hiddenLayers: number[]
    outputSize: number
    learningRate: number
    batchSize: number
    epochs: number
  }
  adaptiveLearning: {
    enableAdaptation: boolean
    adaptationInterval: number
    performanceThreshold: number
    explorationDecay: number
  }
  training: {
    enableAutoTraining: boolean
    trainingInterval: number
    minDataPoints: number
    batchProcessingSize: number
    continuousLearning: boolean
  }
  itemSelection: {
    enableSmartFiltering: boolean
    volumeThreshold: number
    priceRangeMin: number
    priceRangeMax: number
    spreadThreshold: number
    maxItemsToTrade: number
  }
}