# Huong dan training model matching nho

Tai lieu nay giai thich cach train model nho cho chuc nang goi y LOST/FOUND matching trong FPTU Lost & Found System.

## 1. Hieu dung ve model hien tai

Hien tai he thong co 2 lop:

### Lop 1: Matching dang chay trong app

Khi nguoi dung tao bai `LOST` hoac `FOUND`, he thong se:

1. Lay title, mo ta, danh muc, vi tri, thoi gian.
2. Lay tag/OCR tu anh neu Google Vision duoc cau hinh.
3. Tinh diem match bang rule-based/hybrid matching.
4. Luu ket qua vao `match_results`.
5. Hien goi y vat pham tuong tu neu diem du cao.

Day chua phai custom-trained AI model. Day la thuat toan rule-based/hybrid co Google Vision ho tro.

### Lop 2: Model nho train offline

Model nho se hoc tu du lieu feedback:

- Cap LOST/FOUND nao nguoi dung hoac staff danh dau la dung.
- Cap nao bi danh dau la sai.
- Diem rule-based truoc do la bao nhieu.
- OCR/image/category/location/time co dong gop the nao.

Sau khi co du label, chay script train se tao file:

```text
apps/api-node/model-artifacts/match-ranker-logreg.json
```

Model nay la logistic regression reranker nho, dung de so sanh/ho tro thuat toan rule-based. Khong duoc noi day la deep learning hay custom AI production.

## 2. Chuan bi database

Chay migration de tao bang feedback va cac cot phuc vu training:

```bash
npm run migrate:api
```

Migration moi se them:

- `match_results.image_score`
- `match_results.ocr_score`
- `match_results.score_tier`
- `match_results.matcher_version`
- `match_results.explanation_json`
- `match_feedback`
- `match_suggestion_impressions`

Sau do chay app:

```bash
npm run dev
```

## 3. Tao du lieu LOST/FOUND

Tren web:

1. Dang nhap bang tai khoan Student/Staff.
2. Tao 1 bai `LOST`.
3. Upload anh vat bi mat neu co.
4. Tao 1 bai `FOUND` tu tai khoan khac.
5. Upload anh vat nhat duoc.
6. Dam bao 2 bai co mot so thong tin giong nhau, vi du:
   - cung danh muc
   - cung toa/phong
   - thoi gian gan nhau
   - mo ta co token giong nhau
   - anh/OCR/tag giong nhau

He thong se tu chay matching va tao record trong `match_results`.

## 4. Lay matchId

Hien tai backend da co API feedback, nhung UI nut `Dung/Sai/Khong chac` chua duoc gan vao web.

De lay match list:

```http
GET http://localhost:3001/api/posts/:postId/matches
Authorization: Bearer <TOKEN>
```

Trong response se co:

```json
{
  "id": "MATCH_ID",
  "lostPostId": "LOST_POST_ID",
  "foundPostId": "FOUND_POST_ID",
  "totalScore": 0.82
}
```

Can lay:

- `postId`: ID cua bai LOST hoac FOUND.
- `matchId`: ID cua record match.

## 5. Gui feedback dung/sai

Gui feedback dung:

```http
POST http://localhost:3001/api/posts/:postId/matches/:matchId/feedback
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "label": "TRUE_MATCH",
  "note": "Staff xac nhan day la cung mot vat pham"
}
```

Gui feedback sai:

```http
POST http://localhost:3001/api/posts/:postId/matches/:matchId/feedback
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "label": "FALSE_MATCH",
  "note": "Chi giong danh muc, khac vat pham"
}
```

Nhan khac:

```json
{ "label": "UNCERTAIN" }
```

```json
{ "label": "DUPLICATE" }
```

```json
{ "label": "INSUFFICIENT_EVIDENCE" }
```

Y nghia label:

| Label | Dung de train? | Y nghia |
| --- | --- | --- |
| `TRUE_MATCH` | Co, positive | Cap LOST/FOUND dung la cung vat pham |
| `FALSE_MATCH` | Co, negative | He thong goi y sai |
| `DUPLICATE` | Co, negative | Bai trung/lap, khong phai match hop le |
| `INSUFFICIENT_EVIDENCE` | Co, negative | Khong du bang chung de xem la match dung |
| `UNCERTAIN` | Khong | Luu tham khao, bo qua khi train |

## 6. Can bao nhieu feedback?

De test ky thuat:

- Toi thieu 20 label.
- Phai co ca positive va negative.

De demo do an on hon:

- Nen co 100-300 label.
- Nen co nhieu loai vat pham: dien thoai, tai nghe, vi, the sinh vien, laptop, sac, binh nuoc.

De noi ve do chinh xac nghiem tuc:

- Can 1,000+ cap resolved that.
- Can du positive/negative theo tung category.

## 7. Export training data

Sau khi co feedback, chay:

```bash
npm run export:training-data
```

Lenh nay tao file JSONL trong:

```text
apps/api-node/training-exports/
```

Neu chay tu root, output van nam trong workspace cua `apps/api-node`.

File export se:

- hash ID
- redact email/phone/mot so ma nhay cam
- gom score rule-based
- gom label feedback
- gom behavior impression/click/claim-start neu co

Không commit folder `training-exports/` lên git.

## 8. Train model nho

Chay:

```bash
npm run train:match-model
```

Script se tu lay file export moi nhat trong:

```text
apps/api-node/training-exports/
```

Neu muon chi dinh file rieng:

```bash
TRAINING_DATA_PATH=apps/api-node/training-exports/match-training-example.jsonl npm run train:match-model
```

Tren PowerShell:

```powershell
$env:TRAINING_DATA_PATH="apps/api-node/training-exports/match-training-example.jsonl"
npm run train:match-model
```

Ket qua thanh cong se co dang:

```text
Trained match logistic regression model with 120 labeled rows.
Validation F1=0.742, precision=0.800, recall=0.692, threshold=0.57.
Saved model artifact to .../apps/api-node/model-artifacts/match-ranker-logreg.json
```

File model:

```text
apps/api-node/model-artifacts/match-ranker-logreg.json
```

Không commit folder `model-artifacts/` lên git trừ khi team quyết định lưu artifact demo riêng.

## 9. Neu script bao loi

### Loi: No training file found

Chua export data.

Cach sua:

```bash
npm run export:training-data
```

### Loi: Not enough labeled data

Chưa có đủ feedback đúng/sai.

Cach sua:

1. Tao them LOST/FOUND.
2. De he thong match.
3. Gui feedback `TRUE_MATCH` hoac `FALSE_MATCH`.
4. Export lai.
5. Train lai.

### Chi co positive hoac chi co negative

Model can ca 2 lop.

Can co it nhat:

- 1 vai cap `TRUE_MATCH`
- 1 vai cap `FALSE_MATCH` hoac `INSUFFICIENT_EVIDENCE`

## 10. Cach giai thich voi giang vien

Nen noi:

> Ban dau he thong dung rule-based/hybrid matching voi Google Vision OCR/tag. Sau do nhom thu thap feedback dung/sai tu nguoi dung va staff, export dataset da redact thong tin nhay cam, roi train mot logistic regression reranker nho de so sanh voi baseline rule-based.

Khong nen noi:

- He thong da train deep learning model.
- AI tu dong xac minh chu so huu.
- AI tu dong quyet dinh tra do.
- AI tu hoc lien tuc trong production.

Noi an toan:

> Model chi la cong cu ho tro xep hang goi y. Quyet dinh cuoi cung van do nguoi dung/staff/admin xac minh qua claim evidence va quy trinh ban giao.

## 11. Buoc tiep theo nen lam

De viec label de hon, nen them UI trong danh sach match suggestion:

- Nut `Dung vat pham`
- Nut `Khong dung`
- Nut `Khong chac`

Khi bam nut, web goi:

```http
POST /api/posts/:postId/matches/:matchId/feedback
```

Luc do team khong can dung Postman/curl nua, va data training se tang nhanh hon.
