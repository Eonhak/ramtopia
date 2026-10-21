# Lightsail에 추가 배포

이 서버는 게임 웹페이지와 계정 API를 함께 제공합니다. 기존 게임과 다른 도메인/서브도메인으로 접속하고, 같은 주소에서 로그인하는 구성을 권장합니다. GitHub Pages에서는 Node 서버가 실행되지 않습니다.

## 새 Lightsail 인스턴스 만들기

Instances → Create instance → Seoul → Linux/Unix → OS Only → Ubuntu 24.04 LTS를 선택합니다. 메모리 1GB 이상의 요금제에서 표시된 월요금을 확인하고 이름을 `ramtopia-server`로 생성합니다. Networking → Create static IP에서 새 고정 IP를 이 인스턴스에 연결합니다. 기존 `tiny-sword-server`와 그 고정 IP는 변경하지 않습니다. 새 인스턴스의 Networking에서 웹용 TCP 80/443을 열고, 앱 포트 18080은 열지 않습니다.

Ubuntu 24.04 새 서버에서 Docker·Nginx 설치(기존 서버에는 확인 없이 실행하지 않습니다):

```sh
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git
sudo systemctl enable --now docker nginx
```

Docker 그룹 권한을 설정하지 않았다면 아래 `docker compose` 명령 앞에 `sudo`를 붙입니다.

## 기존 서버를 공유하려면 먼저 확인

Lightsail 인스턴스에는 고정 IPv4를 하나만 연결할 수 있습니다. 새로운 IP를 기존 인스턴스에 붙이면 IP가 교체되므로 기존 게임 주소에 영향을 줄 수 있습니다. 서버를 공유하려면 기존 IP를 유지한 채 다른 도메인·내부 포트로 분리합니다.

Lightsail → Instances → 기존 인스턴스 → Connect using SSH에서 다음을 확인합니다. 기존 서비스가 있으면 종료하거나 설정을 덮어쓰지 않습니다.

```sh
cat /etc/os-release
free -h
docker --version
docker compose version
sudo ss -lntp
```

운영체제, 기존 웹서버(Nginx/Apache/Caddy), 사용 도메인을 확인한 다음 설치 방법과 프록시 설정을 결정합니다. 별도의 Lightsail 인스턴스·DB·로드 밸런서를 만들 필요는 없습니다. 단, 기존 인스턴스에 여유 메모리/디스크가 있어야 합니다.

## Docker가 있는 서버

먼저 사용할 도메인의 A 레코드를 Lightsail 고정 IP로 연결합니다. 보안 규칙에는 웹용 80/443을 사용하고, 앱 내부 포트 18080과 DB는 외부에 공개하지 않습니다. 다음 명령의 도메인은 실제 사용할 주소로 바꿉니다.

```sh
git clone https://github.com/Eonhak/ramtopia.git
cd ramtopia
cp .env.example .env
# .env의 APP_ORIGIN을 https://실제-게임-도메인 으로 설정합니다.
docker compose --env-file .env -f deploy/compose.yaml up -d --build
curl http://127.0.0.1:18080/api/health
```

`deploy/nginx.conf.example`은 Nginx를 사용하는 서버용 추가 사이트 예시입니다. 기존 설정을 확인한 뒤 새 사이트에만 적용하고, `sudo nginx -t` 통과 후에 reload합니다. Certbot 등 기존 서버의 인증서 발급 방식으로 해당 도메인의 HTTPS를 활성화해야 로그인 쿠키가 동작합니다. Caddy/Apache를 쓰면 같은 내부 주소로 프록시하는 해당 서버 형식을 사용합니다.

HTTPS 도메인으로 게임을 열면 회원가입·로그인·로그아웃과 새로고침 후 세션 복원이 동작합니다. 계정 DB는 Docker의 `ramtopia_accounts` 볼륨에 유지됩니다. `docker compose down -v`는 계정을 삭제하므로 사용하지 않습니다. SQLite 파일을 백업할 때는 앱을 잠시 정지하고 볼륨 전체를 복사하거나 SQLite backup API를 사용합니다.

업데이트:

```sh
git pull --ff-only
docker compose --env-file .env -f deploy/compose.yaml up -d --build
```

## Node로 직접 실행

Node 22.13 이상이 필요합니다. `npm ci && npm run build` 후 환경 변수 `NODE_ENV=production`, `APP_ORIGIN=https://실제-게임-도메인`, `DATABASE_PATH=/영구저장경로/ramtopia.sqlite`, `PORT=18080`을 설정해 `npm start`를 서비스 관리자로 실행합니다. HTTPS 역방향 프록시는 여전히 필요합니다.

## GitHub Pages를 계속 사용하는 경우

저장소 Settings → Secrets and variables → Actions → Variables에 `VITE_API_BASE_URL=https://실제-API-서버-도메인`을 추가하고 웹 배포를 다시 실행합니다. 서버에는 `APP_ORIGIN=https://실제-API-서버-도메인`, `ALLOWED_ORIGINS=https://eonhak.github.io`를 설정합니다. 외부 사이트 쿠키를 차단하는 모바일 브라우저에서는 세션 유지가 안 될 수 있으므로, 게임과 API를 같은 HTTPS 주소에서 제공하는 구성을 권장합니다.

현재 계정 시스템은 회원가입·로그인·로그아웃만 제공합니다. 게임 저장, 멀티플레이, 이메일 인증, 비밀번호 재설정은 아직 구현하지 않았습니다. 비밀번호는 scrypt 해시로 저장하고 세션 토큰은 DB에 SHA-256 해시만 저장합니다. 세션 쿠키는 HttpOnly이며 운영 HTTPS에서 Secure로 발급됩니다. 운영 서버의 DB 경로와 포트를 외부에 노출하지 않습니다.
