import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { io, type Socket } from "socket.io-client";
import {
  API_ORIGIN,
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  type AdminReport,
  type AdminWarehouseItem,
  type Area,
  type BoardPost,
  type Category,
  type ClaimDetail,
  type ClaimSummary,
  type HandoverPoint,
  type LocalImageAsset,
  type NotificationItem,
  type PostDetail,
  type PostMatchSuggestion,
  type PostType,
  type PublicUser,
  type ReturnAppointment,
  type ReturnFeedback
} from "./src/api";
import { colors, radii, spacing, statusColor } from "./src/theme";

type Tab = "board" | "create" | "matches" | "handover" | "notifications" | "profile" | "staff" | "chat";
type SortMode = "latest" | "oldest" | "highest_match";

const tabs: Array<{ id: Tab; label: string; roles?: string[] }> = [
  { id: "board", label: "Bang tin" },
  { id: "create", label: "Dang bai" },
  { id: "matches", label: "Goi y" },
  { id: "handover", label: "Ban giao" },
  { id: "notifications", label: "Thong bao" },
  { id: "profile", label: "Ca nhan" },
  { id: "staff", label: "Quan ly", roles: ["ADMIN", "STAFF"] },
  { id: "chat", label: "Chat" }
];

function isPrivileged(user: PublicUser | null) {
  return Boolean(user?.roles.some((role) => role === "ADMIN" || role === "STAFF"));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chua co";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function percent(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function pickLabel(type: PostType) {
  return type === "LOST" ? "Da mat" : "Da nhat";
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#98A2B3"
        multiline={props.multiline}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        style={[styles.input, props.multiline && styles.textArea]}
      />
    </View>
  );
}

function Button(props: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "blue";
  disabled?: boolean;
}) {
  const variant = props.variant ?? "primary";
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primaryButton,
        variant === "ghost" && styles.ghostButton,
        variant === "danger" && styles.dangerButton,
        variant === "blue" && styles.blueButton,
        props.disabled && styles.disabledButton,
        pressed && !props.disabled && styles.pressed
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "ghost" && styles.ghostButtonText,
          props.disabled && styles.disabledButtonText
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  const picked = statusColor(tone ?? label);
  return (
    <View style={[styles.badge, { backgroundColor: picked.bg }]}>
      <Text style={[styles.badgeText, { color: picked.fg }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function PostCard({ post, onPress }: { post: BoardPost; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}>
      {post.coverImageUrl ? <Image source={{ uri: post.coverImageUrl }} style={styles.postImage} /> : <View style={styles.postImageFallback} />}
      <View style={styles.postBody}>
        <View style={styles.rowBetween}>
          <Badge label={pickLabel(post.type)} tone={post.type === "LOST" ? "REJECTED" : "MATCHED"} />
          <Badge label={post.status} tone={post.status} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.cardText} numberOfLines={2}>
          {post.description}
        </Text>
        <Text style={styles.metaText}>
          {post.category?.name ?? "Chua phan loai"} · {post.location.buildingName ?? post.location.areaName ?? "Chua ro vi tri"}
        </Text>
        <Text style={styles.metaText}>{formatDate(post.lostFoundAt ?? post.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

function MatchCard(props: {
  suggestion: PostMatchSuggestion;
  onOpen: (postId: string) => void;
  onFeedback: (label: string) => void;
}) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.rowBetween}>
        <Badge label={`${percent(props.suggestion.match.totalScore)} giong`} tone="MATCHED" />
        <Text style={styles.metaText}>{props.suggestion.match.scoreTier ?? "rule score"}</Text>
      </View>
      <Text style={styles.cardTitle}>{props.suggestion.post.title}</Text>
      <Text style={styles.cardText} numberOfLines={2}>
        {props.suggestion.post.description}
      </Text>
      <View style={styles.actionRow}>
        <Button label="Xem bai" variant="blue" onPress={() => props.onOpen(props.suggestion.post.id)} />
        <Button label="Dung" variant="ghost" onPress={() => props.onFeedback("TRUE_MATCH")} />
        <Button label="Sai" variant="ghost" onPress={() => props.onFeedback("FALSE_MATCH")} />
        <Button label="Khong chac" variant="ghost" onPress={() => props.onFeedback("UNCERTAIN")} />
      </View>
    </View>
  );
}

async function pickImages(limit = 5) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Can quyen truy cap anh", "Hay cho phep ung dung chon anh de dang bai hoac gui bang chung.");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.75,
    selectionLimit: limit,
    mediaTypes: ImagePicker.MediaTypeOptions.Images
  });
  if (result.canceled) return [];
  return result.assets.map<LocalImageAsset>((asset) => ({
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType
  }));
}

async function captureImage() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Can quyen camera", "Hay cho phep ung dung dung camera de chup anh vat pham.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.78,
    mediaTypes: ImagePicker.MediaTypeOptions.Images
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `camera-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? "image/jpeg"
  } satisfies LocalImageAsset;
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2600);
  }, []);

  const refreshMe = useCallback(async () => {
    const result = await api.me();
    setUser(result.user);
  }, []);

  useEffect(() => {
    getAccessToken()
      .then(async (token) => {
        if (token) {
          await refreshMe();
        }
      })
      .catch(() => {
        void clearTokens();
      })
      .finally(() => setBooting(false));
  }, [refreshMe]);

  if (booting) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.metaText}>Dang mo FPTU Lost & Found...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthScreen onSignedIn={setUser} />;
  }

  const visibleTabs = tabs.filter((item) => !item.roles || item.roles.some((role) => user.roles.includes(role as never)));

  return (
    <SafeAreaView style={styles.app}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FPT Lost & Found</Text>
            <Text style={styles.headerSub}>Campus Da Nang · Mobile</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>

        {message ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.content}>
          {tab === "board" && <BoardScreen onOpenPost={setSelectedPostId} />}
          {tab === "create" && <CreatePostScreen onCreated={(id) => { setSelectedPostId(id); showMessage("Da dang bai va chay matching."); }} />}
          {tab === "matches" && <MatchesScreen onOpenPost={setSelectedPostId} onMessage={showMessage} />}
          {tab === "handover" && <HandoverScreen />}
          {tab === "notifications" && <NotificationsScreen onOpenPost={setSelectedPostId} onMessage={showMessage} />}
          {tab === "profile" && <ProfileScreen user={user} onUser={setUser} onSignedOut={() => setUser(null)} onMessage={showMessage} />}
          {tab === "staff" && <StaffScreen enabled={isPrivileged(user)} />}
          {tab === "chat" && <ChatScreen />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {visibleTabs.map((item) => (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tabItem, tab === item.id && styles.tabItemActive]}>
              <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <PostDetailModal
        postId={selectedPostId}
        currentUser={user}
        onClose={() => setSelectedPostId(null)}
        onOpenClaim={setSelectedClaimId}
        onMessage={showMessage}
      />
      <ClaimModal
        claimId={selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
        onMessage={showMessage}
      />
    </SafeAreaView>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (user: PublicUser) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "otp">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");

  async function signIn() {
    setLoading(true);
    try {
      const result = await api.login({ email, password });
      await saveTokens(result.tokens);
      onSignedIn(result.user);
    } catch (error) {
      Alert.alert("Dang nhap that bai", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp() {
    setLoading(true);
    try {
      await api.requestRegistrationOtp({ email, password, fullName, studentCode, phoneNumber });
      setMode("otp");
    } catch (error) {
      Alert.alert("Khong gui duoc OTP", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const result = await api.verifyOtp({ email, otp });
      await saveTokens(result.tokens);
      onSignedIn(result.user);
    } catch (error) {
      Alert.alert("OTP khong hop le", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.authScreen}>
      <ScrollView contentContainerStyle={styles.authContent}>
        <View style={styles.authMark}>
          <Text style={styles.authMarkText}>FPT</Text>
        </View>
        <Text style={styles.authTitle}>Lost & Found Campus</Text>
        <Text style={styles.authBody}>Dang nhap de dang bai, gui claim, theo doi lich ban giao va nhan thong bao realtime.</Text>

        {mode !== "otp" ? (
          <>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ban@example.com" />
            <Field label="Mat khau" value={password} onChangeText={setPassword} secureTextEntry placeholder="toi thieu 8 ky tu" />
          </>
        ) : null}

        {mode === "register" ? (
          <>
            <Field label="Ho ten" value={fullName} onChangeText={setFullName} placeholder="Nguyen Van A" />
            <Field label="Ma sinh vien/nhan su" value={studentCode} onChangeText={setStudentCode} placeholder="Tuy chon" />
            <Field label="So dien thoai" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="Tuy chon" />
          </>
        ) : null}

        {mode === "otp" ? (
          <Field label="Ma OTP" value={otp} onChangeText={setOtp} placeholder="Nhap ma trong email" />
        ) : null}

        {mode === "login" && <Button label={loading ? "Dang xu ly..." : "Dang nhap"} disabled={loading} onPress={signIn} />}
        {mode === "register" && <Button label={loading ? "Dang gui..." : "Gui OTP dang ky"} disabled={loading} onPress={requestOtp} />}
        {mode === "otp" && <Button label={loading ? "Dang xac thuc..." : "Xac thuc OTP"} disabled={loading} onPress={verifyOtp} />}

        <View style={styles.authSwitch}>
          <Button label={mode === "login" ? "Tao tai khoan" : "Da co tai khoan"} variant="ghost" onPress={() => setMode(mode === "login" ? "register" : "login")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BoardScreen({ onOpenPost }: { onOpenPost: (id: string) => void }) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PostType | "">("");
  const [sort, setSort] = useState<SortMode>("latest");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listPosts({ page: 1, pageSize: 30, q: query, type, sort });
      setPosts(result.items);
    } catch (error) {
      Alert.alert("Khong tai duoc bang tin", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, [query, sort, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Bang tin that lac</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Tim theo ten vat pham" placeholderTextColor="#98A2B3" style={styles.searchInput} onSubmitEditing={load} />
      <View style={styles.chips}>
        <Chip label="Tat ca" active={type === ""} onPress={() => setType("")} />
        <Chip label="Da mat" active={type === "LOST"} onPress={() => setType("LOST")} />
        <Chip label="Da nhat" active={type === "FOUND"} onPress={() => setType("FOUND")} />
        <Chip label="Moi nhat" active={sort === "latest"} onPress={() => setSort("latest")} />
        <Chip label="Giong nhat" active={sort === "highest_match"} onPress={() => setSort("highest_match")} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onPress={() => onOpenPost(item.id)} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.orange} />}
        ListEmptyComponent={<EmptyState title="Chua co bai phu hop" body="Thu doi bo loc hoac dang bai moi de he thong chay matching." />}
        contentContainerStyle={posts.length === 0 ? styles.listEmpty : styles.listContent}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CreatePostScreen({ onCreated }: { onCreated: (postId: string) => void }) {
  const [type, setType] = useState<PostType>("LOST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [roomText, setRoomText] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [secretVerification, setSecretVerification] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [handoverPoints, setHandoverPoints] = useState<HandoverPoint[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [handoverPointId, setHandoverPointId] = useState("");
  const [images, setImages] = useState<LocalImageAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.categories(), api.areas(), api.handoverPoints()])
      .then(([categoryResult, areaResult, handoverResult]) => {
        setCategories(categoryResult.categories);
        setAreas(areaResult.areas);
        setHandoverPoints(handoverResult.handoverPoints);
        setCategoryId(categoryResult.categories[0]?.id ?? "");
        setAreaId(areaResult.areas[0]?.id ?? "");
      })
      .catch(() => undefined);
  }, []);

  async function chooseImages() {
    const picked = await pickImages(5);
    if (picked.length > 0) setImages(picked);
  }

  async function takePhoto() {
    const photo = await captureImage();
    if (photo) {
      setImages((current) => [photo, ...current].slice(0, 5));
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const result = await api.createPost({
        type,
        title,
        description,
        categoryId,
        areaId: areaId || null,
        roomText: roomText || null,
        customLocation: customLocation || null,
        contactInfo,
        lostFoundAt: new Date().toISOString(),
        handoverPointId: type === "FOUND" && handoverPointId ? handoverPointId : null,
        secretVerification: type === "LOST" ? secretVerification : null
      });
      if (images.length > 0) {
        await api.uploadPostImages(result.post.id, images);
      }
      setTitle("");
      setDescription("");
      setRoomText("");
      setCustomLocation("");
      setSecretVerification("");
      setImages([]);
      onCreated(result.post.id);
    } catch (error) {
      Alert.alert("Khong dang duoc bai", error instanceof Error ? error.message : "Kiem tra lai thong tin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.formContent}>
      <Text style={styles.screenTitle}>Dang LOST/FOUND</Text>
      <View style={styles.segment}>
        <Chip label="Da mat" active={type === "LOST"} onPress={() => setType("LOST")} />
        <Chip label="Da nhat" active={type === "FOUND"} onPress={() => setType("FOUND")} />
      </View>
      <Field label="Ten vat pham" value={title} onChangeText={setTitle} placeholder="Vi du: Tai nghe AirPods trang" />
      <Field label="Mo ta cong khai" value={description} onChangeText={setDescription} multiline placeholder="Mau sac, vi tri, dac diem de nhan biet" />
      <Field label="Lien he" value={contactInfo} onChangeText={setContactInfo} placeholder="Sdt/email lien he" />
      {type === "LOST" ? (
        <Field label="Thong tin xac minh rieng" value={secretVerification} onChangeText={setSecretVerification} multiline placeholder="Serial, vet xuoc, phu kien di kem..." />
      ) : null}
      <Field label="Phong/khu vuc" value={roomText} onChangeText={setRoomText} placeholder="VD: Alpha 315" />
      <Field label="Mo ta vi tri" value={customLocation} onChangeText={setCustomLocation} placeholder="Gan cau thang, san bong..." />

      <Text style={styles.fieldLabel}>Danh muc</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
        {categories.map((category) => (
          <Chip key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
        ))}
      </ScrollView>

      <Text style={styles.fieldLabel}>Khu vuc</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
        {areas.map((area) => (
          <Chip key={area.id} label={area.name} active={areaId === area.id} onPress={() => setAreaId(area.id)} />
        ))}
      </ScrollView>

      {type === "FOUND" ? (
        <>
          <Text style={styles.fieldLabel}>Diem ban giao</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
            {handoverPoints.map((point) => (
              <Chip key={point.id} label={point.name} active={handoverPointId === point.id} onPress={() => setHandoverPointId(point.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.actionRow}>
        <Button label="Chup anh" variant="blue" onPress={takePhoto} />
        <Button label={`Chon anh (${images.length})`} variant="ghost" onPress={chooseImages} />
      </View>
      <View style={styles.previewRow}>
        {images.map((image) => (
          <Image key={image.uri} source={{ uri: image.uri }} style={styles.previewImage} />
        ))}
      </View>
      <Button label={loading ? "Dang dang..." : "Dang bai"} disabled={loading} onPress={submit} />
    </ScrollView>
  );
}

function MatchesScreen(props: { onOpenPost: (id: string) => void; onMessage: (message: string) => void }) {
  const [suggestions, setSuggestions] = useState<PostMatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.myMatchSuggestions();
      setSuggestions(result.suggestions);
    } catch (error) {
      Alert.alert("Khong tai duoc goi y", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function feedback(item: PostMatchSuggestion, label: string) {
    try {
      await api.recordMatchFeedback(item.sourcePostId ?? item.post.id, item.match.id, label);
      props.onMessage("Da luu danh gia match de phuc vu training.");
    } catch (error) {
      Alert.alert("Khong luu duoc feedback", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Goi y tu dong</Text>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.match.id}
        renderItem={({ item }) => (
          <MatchCard suggestion={item} onOpen={props.onOpenPost} onFeedback={(label) => feedback(item, label)} />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.orange} />}
        ListEmptyComponent={<EmptyState title="Chua co goi y moi" body="Khi bai LOST cua ban co vat FOUND tuong tu, he thong se hien tai day." />}
        contentContainerStyle={suggestions.length === 0 ? styles.listEmpty : styles.listContent}
      />
    </View>
  );
}

function HandoverScreen() {
  const [points, setPoints] = useState<HandoverPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.handoverPoints();
      setPoints(result.handoverPoints);
    } catch (error) {
      Alert.alert("Khong tai duoc diem ban giao", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Diem ban giao</Text>
      <FlatList
        data={points}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.orange} />}
        renderItem={({ item }) => (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Badge label={`${item.storedItems ?? 0} mon`} tone="OPEN" />
            </View>
            <Text style={styles.cardText}>{item.address}</Text>
            <Text style={styles.metaText}>Gio: {item.openingHours ?? "Chua cap nhat"}</Text>
            <Text style={styles.metaText}>Lien he: {item.contactInfo ?? "Chua cap nhat"}</Text>
          </View>
        )}
      />
    </View>
  );
}

function NotificationsScreen(props: { onOpenPost: (id: string) => void; onMessage: (message: string) => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.notifications();
      setItems(result.items);
      setUnread(result.unreadCount);
    } catch (error) {
      Alert.alert("Khong tai duoc thong bao", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(item: NotificationItem) {
    try {
      await api.markNotificationRead(item.id);
      if (item.entityType === "POST" && item.entityId) props.onOpenPost(item.entityId);
      props.onMessage("Da danh dau da doc.");
      void load();
    } catch (error) {
      Alert.alert("Khong mo duoc thong bao", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.rowBetween}>
        <Text style={styles.screenTitle}>Thong bao</Text>
        <Badge label={`${unread} chua doc`} tone={unread > 0 ? "OPEN" : "CLOSED"} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.orange} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={[styles.panel, !item.isRead && styles.unreadPanel]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.body ?? "Khong co noi dung"}</Text>
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function ProfileScreen(props: {
  user: PublicUser;
  onUser: (user: PublicUser | null) => void;
  onSignedOut: () => void;
  onMessage: (message: string) => void;
}) {
  const [fullName, setFullName] = useState(props.user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(props.user.phoneNumber ?? "");
  const [activity, setActivity] = useState<Array<{ id: string; action: string; createdAt: string }>>([]);
  const [reputation, setReputation] = useState<{ totalPoints: number; level: string } | null>(null);

  useEffect(() => {
    api.activity().then((result) => setActivity(result.activity)).catch(() => undefined);
    api.reputation().then((result) => setReputation(result.reputation)).catch(() => undefined);
  }, []);

  async function save() {
    try {
      const result = await api.updateProfile({ fullName, phoneNumber });
      props.onUser(result.user);
      props.onMessage("Da cap nhat ho so.");
    } catch (error) {
      Alert.alert("Khong luu duoc ho so", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  async function signOut() {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await api.logout(refreshToken).catch(() => undefined);
    }
    await clearTokens();
    props.onSignedOut();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.formContent}>
      <Text style={styles.screenTitle}>Ca nhan</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>{props.user.fullName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.cardTitle}>{props.user.fullName}</Text>
        <Text style={styles.metaText}>{props.user.email}</Text>
        <View style={styles.chips}>{props.user.roles.map((role) => <Badge key={role} label={role} tone="OPEN" />)}</View>
      </View>
      <Field label="Ho ten" value={fullName} onChangeText={setFullName} />
      <Field label="So dien thoai" value={phoneNumber} onChangeText={setPhoneNumber} />
      <Button label="Luu ho so" onPress={save} />
      {reputation ? (
        <View style={styles.panel}>
          <Text style={styles.cardTitle}>Uy tin</Text>
          <Text style={styles.cardText}>{reputation.totalPoints} diem · {reputation.level}</Text>
        </View>
      ) : null}
      <View style={styles.panel}>
        <Text style={styles.cardTitle}>Hoat dong gan day</Text>
        {activity.slice(0, 5).map((item) => (
          <Text key={item.id} style={styles.metaText}>{item.action} · {formatDate(item.createdAt)}</Text>
        ))}
      </View>
      <Button label="Dang xuat" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}

function StaffScreen({ enabled }: { enabled: boolean }) {
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [warehouse, setWarehouse] = useState<AdminWarehouseItem[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [feedback, setFeedback] = useState<ReturnFeedback[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [overviewResult, warehouseResult, reportsResult, feedbackResult] = await Promise.all([
        api.adminOverview(),
        api.adminWarehouseItems(),
        api.adminReports(),
        api.adminReturnFeedback()
      ]);
      setOverview(overviewResult.overview as unknown as Record<string, number>);
      setWarehouse(warehouseResult.warehouseItems);
      setReports(reportsResult.reports);
      setFeedback(feedbackResult.feedback);
    } catch (error) {
      Alert.alert("Khong tai duoc quan ly", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled) {
    return <EmptyState title="Khong co quyen" body="Man hinh nay chi danh cho Staff/Admin." />;
  }

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.orange} />}>
      <Text style={styles.screenTitle}>Staff dashboard</Text>
      <View style={styles.metricGrid}>
        {["users", "posts", "claims", "reports", "warehouseItems", "handoverPoints"].map((key) => (
          <View key={key} style={styles.metricCard}>
            <Text style={styles.metricValue}>{overview?.[key] ?? 0}</Text>
            <Text style={styles.metaText}>{key}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sectionTitle}>Kho</Text>
      {warehouse.slice(0, 10).map((item) => (
        <View key={item.id} style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.itemName}</Text>
            <Badge label={item.status} tone={item.status} />
          </View>
          <Text style={styles.metaText}>Ma kho: {item.storageCode ?? "Chua co"}</Text>
          <Text style={styles.metaText}>Han luu: {formatDate(item.retentionDeadline)}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Bao cao</Text>
      {reports.slice(0, 6).map((report) => (
        <View key={report.id} style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{report.reason}</Text>
            <Badge label={report.status} tone={report.status} />
          </View>
          <Text style={styles.cardText}>{report.targetText}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Feedback sau ban giao</Text>
      {feedback.slice(0, 8).map((item) => (
        <View key={item.id} style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.rating}/5 - {item.targetUser.fullName ?? "Nguoi dung"}</Text>
            <Badge label={item.status} tone={item.isNegative ? "REJECTED" : "RESOLVED"} />
          </View>
          <Text style={styles.cardText}>{item.comment ?? "Khong co ghi chu"}</Text>
          <Text style={styles.metaText}>{item.postTitle ?? item.postId} ? {formatDate(item.createdAt)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ChatScreen() {
  const [claimId, setClaimId] = useState("");
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; content?: string; senderId?: string; createdAt?: string }>>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  async function join() {
    const token = await getAccessToken();
    if (!token) {
      Alert.alert("Can dang nhap");
      return;
    }
    const nextSocket = io(API_ORIGIN, { auth: { token }, transports: ["websocket"] });
    nextSocket.on("connect", () => {
      setConnected(true);
      nextSocket.emit("claim:join", { claimId }, (payload: unknown) => {
        const response = payload as { ok?: boolean; error?: string };
        if (!response.ok) Alert.alert("Khong vao duoc phong", response.error ?? "Kiem tra claim ID");
      });
    });
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("chat:message", (message) => setMessages((current) => [...current, message]));
    setSocket(nextSocket);
  }

  function send() {
    if (!socket || !content.trim()) return;
    socket.emit("chat:message", { claimId, content: content.trim() });
    setContent("");
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Claim chat</Text>
      <Field label="Claim ID" value={claimId} onChangeText={setClaimId} placeholder="Nhap claim ID da duoc accept" />
      <Button label={connected ? "Da ket noi" : "Vao phong chat"} variant={connected ? "ghost" : "primary"} onPress={join} />
      <ScrollView style={styles.chatBox}>
        {messages.map((item, index) => (
          <View key={`${item.id ?? index}`} style={styles.chatBubble}>
            <Text style={styles.cardText}>{item.content ?? "[Tin nhan anh/he thong]"}</Text>
            <Text style={styles.metaText}>{item.senderId ?? "system"}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.chatInputRow}>
        <TextInput value={content} onChangeText={setContent} placeholder="Nhap tin nhan" placeholderTextColor="#98A2B3" style={styles.chatInput} />
        <Button label="Gui" onPress={send} />
      </View>
    </View>
  );
}

function PostDetailModal(props: {
  postId: string | null;
  currentUser: PublicUser;
  onClose: () => void;
  onOpenClaim: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimDescription, setClaimDescription] = useState("");
  const [claimSecret, setClaimSecret] = useState("");
  const [claimLocation, setClaimLocation] = useState("");

  const load = useCallback(async () => {
    if (!props.postId) return;
    setLoading(true);
    try {
      const result = await api.getPost(props.postId);
      setDetail(result);
      api.postClaims(props.postId).then((claimResult) => setClaims(claimResult.claims)).catch(() => setClaims([]));
    } catch (error) {
      Alert.alert("Khong tai duoc bai", error instanceof Error ? error.message : "Vui long thu lai");
    } finally {
      setLoading(false);
    }
  }, [props.postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitClaim() {
    if (!detail) return;
    try {
      const result = await api.submitClaim({
        postId: detail.post.id,
        description: claimDescription,
        secretAnswer: claimSecret || null,
        approximateLocation: claimLocation || null,
        approximateLostAt: new Date().toISOString()
      });
      props.onMessage("Da gui claim. Hay bo sung bang chung neu co.");
      props.onOpenClaim(result.claim.id);
    } catch (error) {
      Alert.alert("Khong gui duoc claim", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  async function feedback(matchId: string, label: string) {
    if (!detail) return;
    try {
      await api.recordMatchFeedback(detail.post.id, matchId, label);
      props.onMessage("Da luu feedback match.");
    } catch (error) {
      Alert.alert("Khong luu duoc feedback", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  return (
    <Modal visible={Boolean(props.postId)} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.app}>
        <View style={styles.modalHeader}>
          <Button label="Dong" variant="ghost" onPress={props.onClose} />
          <Text style={styles.modalTitle}>Chi tiet bai dang</Text>
        </View>
        {loading || !detail ? (
          <View style={styles.centerScreen}><ActivityIndicator color={colors.orange} /></View>
        ) : (
          <ScrollView style={styles.screen} contentContainerStyle={styles.formContent}>
            <View style={styles.rowBetween}>
              <Badge label={pickLabel(detail.post.type)} tone={detail.post.type === "LOST" ? "REJECTED" : "MATCHED"} />
              <Badge label={detail.post.status} tone={detail.post.status} />
            </View>
            <Text style={styles.detailTitle}>{detail.post.title}</Text>
            <Text style={styles.cardText}>{detail.post.description}</Text>
            <Text style={styles.metaText}>{detail.post.category?.name ?? "Chua co danh muc"} · {detail.post.location.buildingName ?? detail.post.location.areaName ?? "Chua ro vi tri"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
              {detail.media.map((item) => (
                <Image key={item.id} source={{ uri: item.optimizedUrl ?? item.thumbnailUrl ?? item.secureUrl }} style={styles.detailImage} />
              ))}
            </ScrollView>
            <View style={styles.chips}>
              {detail.tags.slice(0, 10).map((tag) => <Badge key={tag.id} label={`${tag.tag} ${percent(tag.confidence)}`} tone="OPEN" />)}
            </View>

            <Text style={styles.sectionTitle}>Match</Text>
            {detail.matches.length === 0 ? <Text style={styles.metaText}>Chua co match.</Text> : null}
            {detail.matches.map((match) => (
              <View key={match.id} style={styles.panel}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{percent(match.totalScore)} giong nhau</Text>
                  <Badge label={match.scoreTier ?? "MATCH"} tone={match.scoreTier ?? "MATCHED"} />
                </View>
                <Text style={styles.metaText}>Text {percent(match.textScore)} · Vi tri {percent(match.locationScore)} · OCR {percent(match.ocrScore)}</Text>
                <View style={styles.actionRow}>
                  <Button label="Dung" variant="ghost" onPress={() => feedback(match.id, "TRUE_MATCH")} />
                  <Button label="Sai" variant="ghost" onPress={() => feedback(match.id, "FALSE_MATCH")} />
                  <Button label="Khong chac" variant="ghost" onPress={() => feedback(match.id, "UNCERTAIN")} />
                </View>
              </View>
            ))}

            {detail.post.type === "FOUND" && detail.post.userId !== props.currentUser.id ? (
              <>
                <Text style={styles.sectionTitle}>Gui claim</Text>
                <Field label="Mo ta quyen so huu" value={claimDescription} onChangeText={setClaimDescription} multiline placeholder="Noi ro dac diem rieng cua vat" />
                <Field label="Cau tra loi rieng" value={claimSecret} onChangeText={setClaimSecret} placeholder="Serial, vet xuoc, phu kien..." />
                <Field label="Vi tri/thoi gian uoc tinh" value={claimLocation} onChangeText={setClaimLocation} placeholder="VD: Alpha 315" />
                <Button label="Gui claim" onPress={submitClaim} />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Claim lien quan</Text>
            {claims.map((claim) => (
              <Pressable key={claim.id} onPress={() => props.onOpenClaim(claim.id)} style={styles.panel}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{claim.claimant.fullName}</Text>
                  <Badge label={claim.status} tone={claim.status} />
                </View>
                <Text style={styles.cardText}>{claim.description ?? "Khong co mo ta"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ClaimModal(props: { claimId: string | null; onClose: () => void; onMessage: (message: string) => void }) {
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [appointments, setAppointments] = useState<ReturnAppointment[]>([]);
  const [confidence, setConfidence] = useState<{ ownershipConfidence: number; level: string; note: string } | null>(null);
  const [handoverPoints, setHandoverPoints] = useState<HandoverPoint[]>([]);
  const [handoverPointId, setHandoverPointId] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");

  const load = useCallback(async () => {
    if (!props.claimId) return;
    const [claimResult, appointmentResult, hpResult] = await Promise.all([
      api.getClaim(props.claimId),
      api.claimAppointments(props.claimId).catch(() => ({ appointments: [] })),
      api.handoverPoints().catch(() => ({ handoverPoints: [] }))
    ]);
    setDetail(claimResult);
    setAppointments(appointmentResult.appointments);
    setHandoverPoints(hpResult.handoverPoints);
    setHandoverPointId(hpResult.handoverPoints[0]?.id ?? "");
    api.claimVerification(props.claimId).then((result) => setConfidence(result.verification)).catch(() => setConfidence(null));
  }, [props.claimId]);

  useEffect(() => {
    load().catch((error) => Alert.alert("Khong tai duoc claim", error instanceof Error ? error.message : "Vui long thu lai"));
  }, [load]);

  async function uploadEvidence() {
    if (!props.claimId) return;
    const picked = await pickImages(1);
    if (picked[0]) {
      const result = await api.uploadClaimEvidence(props.claimId, picked[0]);
      setDetail(result);
      props.onMessage("Da tai bang chung.");
    }
  }

  async function captureEvidence() {
    if (!props.claimId) return;
    const photo = await captureImage();
    if (photo) {
      const result = await api.uploadClaimEvidence(props.claimId, photo);
      setDetail(result);
      props.onMessage("Da tai anh bang chung.");
    }
  }

  async function createAppointment() {
    if (!detail) return;
    try {
      const proposedAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await api.createAppointment({
        claimId: detail.claim.id,
        proposedAt,
        handoverPointId: handoverPointId || null,
        customLocation: handoverPointId ? null : "FPTU campus"
      });
      props.onMessage("Da tao lich ban giao.");
      await load();
    } catch (error) {
      Alert.alert("Khong tao duoc lich", error instanceof Error ? error.message : "Claim can duoc chap nhan truoc");
    }
  }

  async function submitFeedback(appointmentId: string, rating: number) {
    try {
      await api.submitAppointmentFeedback(appointmentId, {
        rating,
        comment: feedbackComment || null
      });
      setFeedbackComment("");
      props.onMessage("Da gui feedback sau ban giao.");
    } catch (error) {
      Alert.alert("Khong gui duoc feedback", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  async function uploadAppointmentProof(appointmentId: string, source: "camera" | "library") {
    try {
      const image = source === "camera" ? await captureImage() : (await pickImages(1))[0] ?? null;
      if (!image) {
        return;
      }
      await api.uploadAppointmentProof(appointmentId, image, "Chung tu ban giao tu mobile");
      props.onMessage("Da tai chung tu ban giao.");
      await load();
    } catch (error) {
      Alert.alert("Khong tai duoc chung tu", error instanceof Error ? error.message : "Vui long thu lai");
    }
  }

  async function accept() {
    if (!detail) return;
    await api.acceptClaim(detail.claim.id);
    props.onMessage("Da chap nhan claim.");
    await load();
  }

  async function reject() {
    if (!detail) return;
    await api.rejectClaim(detail.claim.id, "Khong du bang chung tren mobile");
    props.onMessage("Da tu choi claim.");
    await load();
  }

  return (
    <Modal visible={Boolean(props.claimId)} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.app}>
        <View style={styles.modalHeader}>
          <Button label="Dong" variant="ghost" onPress={props.onClose} />
          <Text style={styles.modalTitle}>Claim</Text>
        </View>
        {!detail ? (
          <View style={styles.centerScreen}><ActivityIndicator color={colors.orange} /></View>
        ) : (
          <ScrollView style={styles.screen} contentContainerStyle={styles.formContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.detailTitle}>Yeu cau nhan do</Text>
              <Badge label={detail.claim.status} tone={detail.claim.status} />
            </View>
            <Text style={styles.cardText}>{detail.claim.description ?? "Khong co mo ta"}</Text>
            <Text style={styles.metaText}>Nguoi claim: {detail.claim.claimant.fullName}</Text>
            {confidence ? (
              <View style={styles.panelHighlight}>
                <Text style={styles.cardTitle}>Muc ho tro xac thuc {Math.round(confidence.ownershipConfidence * 100)}%</Text>
                <Text style={styles.cardText}>{confidence.level} · {confidence.note}</Text>
              </View>
            ) : null}
            <View style={styles.actionRow}>
              <Button label="Chap nhan" variant="blue" onPress={accept} />
              <Button label="Tu choi" variant="danger" onPress={reject} />
              <Button label="Chup bang chung" variant="ghost" onPress={captureEvidence} />
              <Button label="Tai bang chung" variant="ghost" onPress={uploadEvidence} />
            </View>
            <Text style={styles.sectionTitle}>Bang chung</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {detail.evidence.map((item) => <Image key={item.id} source={{ uri: item.secureUrl }} style={styles.detailImage} />)}
            </ScrollView>
            <Text style={styles.sectionTitle}>Lich ban giao</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPicker}>
              {handoverPoints.map((point) => <Chip key={point.id} label={point.name} active={handoverPointId === point.id} onPress={() => setHandoverPointId(point.id)} />)}
            </ScrollView>
            <Button label="Tao lich ngay mai" onPress={createAppointment} />
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.panel}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{appointment.handoverPoint?.name ?? appointment.customLocation ?? "Campus"}</Text>
                  <Badge label={appointment.status} tone={appointment.status} />
                </View>
                <Text style={styles.metaText}>{formatDate(appointment.proposedAt)}</Text>
                {appointment.proof ? (
                  <View style={styles.proofBox}>
                    <Text style={styles.cardTitle}>Chung tu ban giao</Text>
                    <Text style={styles.metaText}>
                      {appointment.proof.uploadedBy?.fullName ?? "Nguoi dung"} · {formatDate(appointment.proof.uploadedAt)}
                    </Text>
                    {appointment.proof.note ? <Text style={styles.cardText}>{appointment.proof.note}</Text> : null}
                  </View>
                ) : null}
                {appointment.status === "ACCEPTED" || appointment.status === "COMPLETED" ? (
                  <View style={styles.actionRow}>
                    <Button label="Chup chung tu" variant="ghost" onPress={() => uploadAppointmentProof(appointment.id, "camera")} />
                    <Button label="Tai chung tu" variant="ghost" onPress={() => uploadAppointmentProof(appointment.id, "library")} />
                  </View>
                ) : null}
                {appointment.status === "COMPLETED" ? (
                  <View style={styles.feedbackBox}>
                    <Field label="Feedback sau ban giao" value={feedbackComment} onChangeText={setFeedbackComment} placeholder="Nhan xet ngan, neu can" />
                    <View style={styles.actionRow}>
                      <Button label="5 sao" variant="ghost" onPress={() => submitFeedback(appointment.id, 5)} />
                      <Button label="3 sao" variant="ghost" onPress={() => submitFeedback(appointment.id, 3)} />
                      <Button label="1 sao" variant="danger" onPress={() => submitFeedback(appointment.id, 1)} />
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  brand: { color: colors.orange, fontSize: 20, fontWeight: "800" },
  headerSub: { color: colors.muted, marginTop: 2, fontSize: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.surface, fontWeight: "800" },
  content: { flex: 1 },
  screen: { flex: 1, padding: spacing.lg },
  screenTitle: { color: colors.ink, fontSize: 24, fontWeight: "900", marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.ink,
    marginBottom: spacing.md
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.surface },
  listContent: { paddingBottom: 110, gap: spacing.md },
  listEmpty: { flexGrow: 1, paddingBottom: 110 },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderColor: colors.line,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  postImage: { height: 150, width: "100%", backgroundColor: colors.blueSoft },
  postImageFallback: { height: 72, backgroundColor: colors.orangeSoft },
  postBody: { padding: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  metaText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.ink, fontWeight: "800", marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  button: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: colors.orange },
  blueButton: { backgroundColor: colors.blue },
  dangerButton: { backgroundColor: colors.red },
  ghostButton: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 },
  disabledButton: { backgroundColor: "#EAECF0" },
  buttonText: { color: colors.surface, fontWeight: "900" },
  ghostButtonText: { color: colors.blue },
  disabledButtonText: { color: colors.muted },
  pressed: { opacity: 0.75 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontWeight: "900", fontSize: 18, textAlign: "center" },
  emptyBody: { color: colors.muted, textAlign: "center", lineHeight: 21, marginTop: spacing.sm },
  tabBar: { maxHeight: 74, backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1 },
  tabBarContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tabItem: { paddingHorizontal: spacing.md, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  tabItemActive: { backgroundColor: colors.ink },
  tabText: { color: colors.muted, fontWeight: "800" },
  tabTextActive: { color: colors.surface },
  toast: { margin: spacing.md, backgroundColor: colors.ink, borderRadius: radii.md, padding: spacing.md },
  toastText: { color: colors.surface, fontWeight: "700" },
  authScreen: { flex: 1, backgroundColor: colors.canvas },
  authContent: { padding: spacing.xl, justifyContent: "center", flexGrow: 1 },
  authMark: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  authMarkText: { color: colors.surface, fontWeight: "900", fontSize: 24 },
  authTitle: { color: colors.ink, fontSize: 32, fontWeight: "900", marginBottom: spacing.sm },
  authBody: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: spacing.xl },
  authSwitch: { marginTop: spacing.md },
  formContent: { paddingBottom: 120 },
  segment: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  horizontalPicker: { marginBottom: spacing.md },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md },
  previewImage: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.line },
  matchCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderColor: colors.line, borderWidth: 1, gap: spacing.sm },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  feedbackBox: { marginTop: spacing.md, gap: spacing.sm },
  proofBox: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#F8FBFF",
    padding: spacing.md
  },
  panel: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderColor: colors.line, borderWidth: 1, marginBottom: spacing.md, gap: spacing.sm },
  panelHighlight: { backgroundColor: colors.greenSoft, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  unreadPanel: { borderColor: colors.orange, borderWidth: 1.5 },
  profileCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, alignItems: "center", marginBottom: spacing.lg },
  avatarLarge: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarTextLarge: { color: colors.surface, fontWeight: "900", fontSize: 28 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { width: "31%", backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderColor: colors.line, borderWidth: 1 },
  metricValue: { color: colors.orange, fontWeight: "900", fontSize: 22 },
  chatBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, marginVertical: spacing.md },
  chatBubble: { backgroundColor: colors.blueSoft, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  chatInputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  chatInput: { flex: 1, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  modalHeader: { backgroundColor: colors.surface, padding: spacing.md, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  modalTitle: { color: colors.ink, fontWeight: "900", fontSize: 18 },
  detailTitle: { color: colors.ink, fontWeight: "900", fontSize: 28, marginVertical: spacing.md },
  mediaStrip: { marginVertical: spacing.md },
  detailImage: { width: 180, height: 140, borderRadius: radii.lg, backgroundColor: colors.line, marginRight: spacing.sm }
});
