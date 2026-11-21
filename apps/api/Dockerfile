# Multi-stage build for the Go API.
# Build from the repository root: docker build -f apps/api/Dockerfile .

FROM golang:1.25-alpine AS build
WORKDIR /src

RUN apk add --no-cache git

COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata wget && addgroup -S app && adduser -S -G app app
ENV TZ=Asia/Jakarta
WORKDIR /app

COPY --from=build /out/api /app/api
RUN chown -R app:app /app
USER app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1

ENTRYPOINT ["/app/api"]
