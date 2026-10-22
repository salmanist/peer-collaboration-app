with open(r'mobile\src\features\ondemand\presentation\ActiveRideScreen.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

target = """export default function ActiveRideScreen() {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const userId = useSessionStore((state) => state.user?.id);
  const [ride, setRide] = useState<OnDemandRide | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);"""

replacement = """export interface ActiveRideScreenProps {
  embedded?: boolean;
  initialRide?: OnDemandRide | null;
  onClose?: () => void;
}

export default function ActiveRideScreen({ embedded = false, initialRide, onClose }: ActiveRideScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const userId = useSessionStore((state) => state.user?.id);
  const [ride, setRide] = useState<OnDemandRide | null>(initialRide ?? null);
  const [isLoaded, setIsLoaded] = useState(!!initialRide);"""

c_lf = c.replace('\r\n', '\n')
target_lf = target.replace('\r\n', '\n')
replacement_lf = replacement.replace('\r\n', '\n')

if target_lf in c_lf:
    c_lf = c_lf.replace(target_lf, replacement_lf, 1)
    c_lf = c_lf.replace('const goHome = () => router.replace("/(app)/rides");', 'const goHome = () => (onClose ? onClose() : router.replace("/(app)/rides"));')
    with open(r'mobile\src\features\ondemand\presentation\ActiveRideScreen.tsx', 'w', encoding='utf-8') as f:
        f.write(c_lf)
    print('Updated ActiveRideScreen.tsx successfully!')
else:
    print('Target not found!')
