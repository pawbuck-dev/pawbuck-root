# PawBuck.API — ECS Fargate / ALB (listen on 8080)
# Build context MUST be the repository root (not this folder alone):
#   docker build -f backend/PawBuck.API/Dockerfile -t pawbuck-api:latest .

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore layer (project references + linked journal tree content paths)
COPY backend/PawBuck.MedicationAdr/PawBuck.MedicationAdr.csproj backend/PawBuck.MedicationAdr/
COPY backend/PawBuck.API/PawBuck.API.csproj backend/PawBuck.API/
COPY packages/milo-journal-trees/trees/ packages/milo-journal-trees/trees/
RUN dotnet restore backend/PawBuck.API/PawBuck.API.csproj

COPY backend/PawBuck.MedicationAdr/ backend/PawBuck.MedicationAdr/
COPY backend/PawBuck.API/ backend/PawBuck.API/
COPY packages/milo-journal-trees/trees/ packages/milo-journal-trees/trees/

RUN dotnet publish backend/PawBuck.API/PawBuck.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
ENV DOTNET_RUNNING_IN_CONTAINER=true
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PawBuck.API.dll"]
