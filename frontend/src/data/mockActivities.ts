export type ActivityType = 'run' | 'ride' | 'swim';
export type ActivityStatus = 'logged' | 'missing';

export interface MockSupplement {
  id: string;
  name: string;
  servings: number;
  servingUnit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat?: number;
  sodium?: number;
  caffeine?: number;
  phase: 'pre' | 'during' | 'post';
  imageUrl: string;
}

export interface MockActivity {
  id: string;
  type: ActivityType;
  title: string;
  dateLabel: string;
  date: string;
  startTime: string;
  distance: string;
  duration: string;
  heartRate?: number;
  status: ActivityStatus;
  supplements: MockSupplement[];
  summary: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
}

export const mockActivities: MockActivity[] = [
  {
    id: '1',
    type: 'run',
    title: 'Morning Run',
    dateLabel: 'Jul 15, 2024',
    date: '2024-07-15',
    startTime: '08:00',
    distance: '10.2 km',
    duration: '1h 15m',
    heartRate: 155,
    status: 'logged',
    supplements: [
      {
        id: 'gel',
        name: 'Energy Gel',
        servings: 2,
        servingUnit: 'porções',
        calories: 100,
        carbs: 25,
        protein: 5,
        fat: 1,
        sodium: 220,
        caffeine: 40,
        phase: 'during',
        imageUrl:
          'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=160&q=80',
      },
      {
        id: 'shake',
        name: 'Protein Shake',
        servings: 1,
        servingUnit: 'scoop',
        calories: 120,
        carbs: 10,
        protein: 20,
        fat: 2,
        sodium: 180,
        phase: 'post',
        imageUrl:
          'https://images.unsplash.com/photo-1580915411954-282cb1c99404?auto=format&fit=crop&w=160&q=80',
      },
    ],
    summary: {
      calories: 220,
      carbs: 35,
      protein: 25,
      fat: 3,
    },
  },
  {
    id: '2',
    type: 'ride',
    title: 'Tempo Ride',
    dateLabel: 'Jul 12, 2024',
    date: '2024-07-12',
    startTime: '06:30',
    distance: '45.4 km',
    duration: '1h 40m',
    heartRate: 148,
    status: 'missing',
    supplements: [
      {
        id: 'drink',
        name: 'Electrolyte Drink',
        servings: 1,
        servingUnit: 'garrafa',
        calories: 80,
        carbs: 18,
        protein: 0,
        sodium: 320,
        phase: 'during',
        imageUrl:
          'https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&w=160&q=80',
      },
    ],
    summary: {
      calories: 80,
      carbs: 18,
      protein: 0,
      fat: 0,
    },
  },
  {
    id: '3',
    type: 'swim',
    title: 'Open Water Session',
    dateLabel: 'Jul 10, 2024',
    date: '2024-07-10',
    startTime: '07:15',
    distance: '2.4 km',
    duration: '58m',
    heartRate: 140,
    status: 'logged',
    supplements: [
      {
        id: 'bar',
        name: 'Carb Bar',
        servings: 1,
        servingUnit: 'barra',
        calories: 95,
        carbs: 22,
        protein: 4,
        fat: 2,
        sodium: 150,
        phase: 'pre',
        imageUrl:
          'https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=160&q=80',
      },
    ],
    summary: {
      calories: 95,
      carbs: 22,
      protein: 4,
      fat: 2,
    },
  },
];
