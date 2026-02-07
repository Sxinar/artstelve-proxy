# Artstelve Proxy

A high-performance, privacy-focused meta-search proxy and scraper aggregator.

---

### [TR] Hakkında
Artstelve Proxy, birden fazla arama motorundan gelen sonuçları bir araya getiren, gizlilik odaklı ve yüksek performanslı bir meta-arama aracıdır. TypeScript ile geliştirilmiş olup, çeşitli arama motorlarını (Google, DuckDuckGo, Brave vb.) eş zamanlı olarak tarayarak temiz ve normalize edilmiş veriler sunar.

### [EN] About
Artstelve Proxy is a high-performance, privacy-focused meta-search and scraper aggregator. Built with TypeScript, it concurrently scrapes multiple search engines (Google, DuckDuckGo, Brave, etc.) to provide clean, normalized search data.

---

## Özellikler / Features

- **Multi-Engine Aggregation**: Google, DuckDuckGo, Brave, Yahoo ve daha fazlasını tek bir API'de birleştirir.
- **Scraper Reliability**: User-Agent rotasyonu ve gelişmiş HTTP başlıkları ile bot engellerini aşar.
- **Search Types**: Web aramasına ek olarak Görsel, Video ve Haber aramalarını destekler.
- **Health Monitoring**: Her bir motorun başarı oranını ve hata durumunu gerçek zamanlı takip eden dashboard.
- **Developer Friendly**: Basit JSON çıktıları ve detaylı durum (status) raporları.
- **Performance**: Eş zamanlı (concurrent) istek yönetimi ile düşük gecikme süresi.

---

## API Uç Noktaları / Endpoints

#### `GET /search?q={query}`
Standard web araması sonuçlarını döner. 
*Parametreler: `engines`, `limitTotal`, `region`.*

#### `GET /images?q={query}`
Farklı kaynaklardan derlenmiş görsel sonuçlarını döner.

#### `GET /status`
Proxy'nin çalışma durumu, bellek kullanımı ve motor sağlık verilerini içeren teknik rapor.

#### `GET /health`
Servis sağlığı hakkında hızlı durum bilgisi (JSON).

---

## Kurulum / Installation

1. Bağımlılıkları yükleyin / Install dependencies:
   ```bash
   npm install
   ```

2. Geliştirme modunda başlatın / Run in dev mode:
   ```bash
   npm run dev
   ```

3. Üretim (Build) için / To build:
   ```bash
   npm run build
   ```

---

## Yapılandırma / Configuration

`.env` dosyası üzerinden şu ayarlar yapılabilir:
- `PORT`: Uygulamanın çalışacağı port.
- `GLOBAL_ENGINE_CONCURRENCY`: Aynı anda yapılabilecek toplam motor isteği sayısı.
- `PER_ENGINE_CONCURRENCY`: Her bir motor için eş zamanlı istek sınırı.

---

## Lisans / License
MIT
