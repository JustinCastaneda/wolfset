import 'expo-router/entry';

import { AppRegistry } from 'react-native';

import { installWatchStart } from '@/features/set-loop/session-controller';
import { WORKOUT_TASK, runWorkoutTask } from '@/features/set-loop/workout-task';

// The app's entry: expo-router's, plus the two things that must exist before — or
// without — any screen: the workout's headless task (the native WorkoutService runs it
// to keep the session alive off screen, and to boot the session when the watch starts a
// workout with the app dead), and the app-wide Next Workout listener.
AppRegistry.registerHeadlessTask(WORKOUT_TASK, () => runWorkoutTask);
installWatchStart();
