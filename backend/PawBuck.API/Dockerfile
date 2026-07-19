# PawBuck.API — ECS Fargate / ALB (listen on 8080)
# Build context MUST be the repository root (not this folder alone):
#   docker build -f backend/PawBuck.API/Dockerfile -t pawbuck-api:latest .
# Multi-arch (Graviton): the SDK stage runs on the build host's native arch
# ($BUILDPLATFORM) and cross-compiles for $TARGETARCH, so
#   docker buildx build --platform linux/arm64 ...
# does not pay the QEMU emulation cost for dotnet restore/publish.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /src

# Restore layer (project references + linked journal tree content paths)
COPY backend/PawBuck.MedicationAdr/PawBuck.MedicationAdr.csproj backend/PawBuck.MedicationAdr/
COPY backend/PawBuck.API/PawBuck.API.csproj backend/PawBuck.API/
COPY packages/milo-journal-trees/trees/ packages/milo-journal-trees/trees/
# Docker uses "amd64"; dotnet -a expects "x64" (arm64 matches as-is).
RUN arch="${TARGETARCH:-x64}"; [ "$arch" = "amd64" ] && arch=x64; \
    dotnet restore backend/PawBuck.API/PawBuck.API.csproj -a "$arch"

COPY backend/PawBuck.MedicationAdr/ backend/PawBuck.MedicationAdr/
COPY backend/PawBuck.API/ backend/PawBuck.API/
COPY packages/milo-journal-trees/trees/ packages/milo-journal-trees/trees/

RUN arch="${TARGETARCH:-x64}"; [ "$arch" = "amd64" ] && arch=x64; \
    dotnet publish backend/PawBuck.API/PawBuck.API.csproj -c Release -a "$arch" -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
ENV DOTNET_RUNNING_IN_CONTAINER=true
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PawBuck.API.dll"]
