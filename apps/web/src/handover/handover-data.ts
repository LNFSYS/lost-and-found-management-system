import type { HandoverPoint } from "../services/api";
import type { CampusArea, HandoverPointView } from "./types";

const campusAreas: CampusArea[] = [
  "Alpha",
  "Beta",
  "Gamma",
  "Căng tin",
  "KTX",
  "Cổng chính",
  "Cổng phụ",
  "Khu để xe",
  "Nhà võ",
  "Khu thể thao",
  "Nhà giữ xe cán bộ",
  "Cổng nhà xe"
];

export const handoverAreaOptions: Array<"all" | CampusArea> = ["all", ...campusAreas];

export const mockHandoverPoints: HandoverPointView[] = [
  {
    id: "alpha-student-service",
    name: "Quầy CTSV Alpha",
    address: "Tầng 1, tòa Alpha",
    openingHours: "08:00 - 17:30",
    area: "Alpha",
    description: "Điểm tiếp nhận chính cho đồ thất lạc, giấy tờ và vật dụng giá trị.",
    status: "active",
    owner: "Phòng Công tác sinh viên",
    storedItems: 18,
    mapKey: "alpha",
    mapPosition: { x: 82, y: 50 },
    routeHint: "Đi từ cổng chính vào sảnh Alpha, quầy nằm bên phải khu lễ tân."
  },
  {
    id: "library-beta",
    name: "Quầy Thư viện Beta",
    address: "Tầng 1, khu tự học Beta",
    openingHours: "07:30 - 21:00",
    area: "Beta",
    description: "Lưu đồ nhặt được quanh thư viện, phòng tự học và hành lang Beta.",
    status: "active",
    owner: "Tổ Thư viện",
    storedItems: 11,
    mapKey: "beta",
    mapPosition: { x: 55, y: 72 },
    routeHint: "Theo trục đường trung tâm tới Beta, vào cửa hướng sân trong."
  },
  {
    id: "security-main-gate",
    name: "Phòng Bảo vệ Cổng chính",
    address: "Nhà bảo vệ tại cổng chính",
    openingHours: "24/7",
    area: "Cổng chính",
    description: "Hỗ trợ nhận/trả đồ ngoài giờ hành chính và các vật dụng tìm thấy ở lối vào.",
    status: "active",
    owner: "Đội Bảo vệ FPTU Đà Nẵng",
    storedItems: 7,
    mapKey: "main-gate",
    mapPosition: { x: 88, y: 49 },
    routeHint: "Tới cổng chính phía đông campus, liên hệ trực tiếp nhà bảo vệ."
  },
  {
    id: "canteen-counter",
    name: "Quầy Căng tin",
    address: "Khu căng tin sinh viên",
    openingHours: "06:30 - 19:30",
    area: "Căng tin",
    description: "Ưu tiên đồ bỏ quên tại bàn ăn, quầy nước, khu vực sinh hoạt chung.",
    status: "active",
    owner: "Ban quản lý Căng tin",
    storedItems: 9,
    mapKey: "canteen",
    mapPosition: { x: 34, y: 52 },
    routeHint: "Đi từ sân trung tâm sang khu Căng tin, hỏi tại quầy thu ngân."
  },
  {
    id: "dorm-reception",
    name: "Lễ tân Ký túc xá",
    address: "Sảnh KTX, khu ký túc xá",
    openingHours: "06:00 - 22:00",
    area: "KTX",
    description: "Điểm bàn giao cho đồ thất lạc tại khu lưu trú và sân trước KTX.",
    status: "active",
    owner: "Ban quản lý Ký túc xá",
    storedItems: 14,
    mapKey: "dorm",
    mapPosition: { x: 43, y: 37 },
    routeHint: "Từ sân chính rẽ về khu KTX phía tây bắc, vào sảnh lễ tân."
  },
  {
    id: "parking-booth",
    name: "Chốt Khu để xe",
    address: "Nhà xe sinh viên",
    openingHours: "06:00 - 20:30",
    area: "Khu để xe",
    description: "Nhận chìa khóa, mũ bảo hiểm, thẻ xe và vật dụng bỏ quên tại nhà xe.",
    status: "active",
    owner: "Tổ giữ xe",
    storedItems: 22,
    mapKey: "parking",
    mapPosition: { x: 29, y: 24 },
    routeHint: "Tới khu để xe phía cổng nhà xe, liên hệ chốt bảo vệ gần lối ra."
  },
  {
    id: "sports-office",
    name: "Văn phòng Khu thể thao",
    address: "Khu sân thể thao",
    openingHours: "15:00 - 20:00",
    area: "Khu thể thao",
    description: "Tạm lưu bình nước, giày, áo khoác và thiết bị thể thao bị bỏ quên.",
    status: "closed",
    owner: "CLB Thể thao",
    storedItems: 5,
    mapKey: "sports",
    mapPosition: { x: 39, y: 78 },
    routeHint: "Đi về cụm sân phía nam campus; điểm này đang tạm đóng."
  }
];

const enrichments = mockHandoverPoints;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferArea(point: HandoverPoint): CampusArea {
  const text = normalizeText(`${point.name} ${point.address}`);
  if (text.includes("alpha")) return "Alpha";
  if (text.includes("beta") || text.includes("thu vien")) return "Beta";
  if (text.includes("gamma")) return "Gamma";
  if (text.includes("cang tin")) return "Căng tin";
  if (text.includes("ky tuc") || text.includes("ktx") || text.includes("dorm")) return "KTX";
  if (text.includes("cong phu")) return "Cổng phụ";
  if (text.includes("cong nha xe")) return "Cổng nhà xe";
  if (text.includes("cong")) return "Cổng chính";
  if (text.includes("xe")) return "Khu để xe";
  return "Alpha";
}

function mapKeyFromArea(area: CampusArea) {
  const map: Record<CampusArea, string> = {
    Alpha: "alpha",
    Beta: "beta",
    Gamma: "gamma",
    "Căng tin": "canteen",
    KTX: "dorm",
    "Cổng chính": "main-gate",
    "Cổng phụ": "side-gate",
    "Khu để xe": "parking",
    "Nhà võ": "gym",
    "Khu thể thao": "sports",
    "Nhà giữ xe cán bộ": "staff-parking",
    "Cổng nhà xe": "parking-gate"
  };
  return map[area];
}

function mapPositionFromArea(area: CampusArea) {
  const map: Record<CampusArea, { x: number; y: number }> = {
    Alpha: { x: 82, y: 50 },
    Beta: { x: 55, y: 72 },
    Gamma: { x: 76, y: 78 },
    "Căng tin": { x: 34, y: 52 },
    KTX: { x: 43, y: 37 },
    "Cổng chính": { x: 88, y: 49 },
    "Cổng phụ": { x: 73, y: 88 },
    "Khu để xe": { x: 29, y: 24 },
    "Nhà võ": { x: 49, y: 24 },
    "Khu thể thao": { x: 39, y: 78 },
    "Nhà giữ xe cán bộ": { x: 62, y: 61 },
    "Cổng nhà xe": { x: 19, y: 18 }
  };
  return map[area];
}

export function buildHandoverPoints(apiPoints: HandoverPoint[]): HandoverPointView[] {
  if (apiPoints.length === 0) {
    return [];
  }

  return apiPoints.map((point, index) => {
    const template = enrichments[index % enrichments.length];
    const area = inferArea(point);
    return {
      ...point,
      area,
      description: template.description,
      status: "active",
      owner: point.contactInfo ?? template.owner,
      storedItems: point.storedItems ?? 0,
      mapKey: mapKeyFromArea(area),
      mapImageUrl: point.mapImageUrl ?? template.mapImageUrl,
      mapPosition:
        point.mapPositionX !== null && point.mapPositionX !== undefined && point.mapPositionY !== null && point.mapPositionY !== undefined
          ? { x: point.mapPositionX, y: point.mapPositionY }
          : mapPositionFromArea(area),
      routeHint: template.routeHint
    };
  });
}
