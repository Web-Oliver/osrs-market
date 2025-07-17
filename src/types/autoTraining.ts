export interface AutoTrainingConfig {
  dataCollection: {
    updateInterval: number
    maxRetries: number
    enableTimeseriesData: boolean
    enableMapping: boolean
    enableHistoricalData: boolean
    enablePersistence: boolean
    persistence?: {
      type: 'mongodb' | 'file'
      config: {
        connectionString: string
        databaseName: string
        options: {
          maxPoolSize: number
          serverSelectionTimeoutMS: number
          retryWrites: boolean
          w: string
        }
      }
    }
    itemFilters: {
      minPrice: number
      maxPrice: number
      membersOnly: boolean
      tradeable: boolean
      grandExchange: boolean
    }
    dataRetention: {
      maxAge: number
      maxRecords: number
    }
  }
  neuralNetwork: {
    inputSize: number
    hiddenLayers: number[]
    outputSize: number
    learningRate: number
    batchSize: number
    memorySize: number
    epsilon: number
    epsilonDecay: number
    epsilonMin: number
    gamma: number
    tau: number
  }
  adaptiveLearning: {
    enableOnlineLearning: boolean
    learningFrequency: number
    performanceThreshold: number
    adaptationRate: number
    memoryRetention: number
    explorationBoost: boolean
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