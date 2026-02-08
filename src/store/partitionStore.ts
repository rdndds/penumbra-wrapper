import { create } from 'zustand';
import type { Partition } from '../types';

interface PartitionState {
  partitions: Partition[];
  selectedPartition: Partition | null;
  
  // Actions
  setPartitions: (partitions: Partition[]) => void;
  selectPartition: (partition: Partition | null) => void;
  findPartitionByName: (name: string) => Partition | undefined;
  clearPartitions: () => void;
}

export const usePartitionStore = create<PartitionState>((set, get) => ({
  partitions: [],
  selectedPartition: null,
  
  setPartitions: (partitions) => set({ partitions }),
  
  selectPartition: (partition) => set({ selectedPartition: partition }),
  
  findPartitionByName: (name) => {
    return get().partitions.find(p => p.name === name);
  },
  
  clearPartitions: () => set({ partitions: [], selectedPartition: null }),
}));
