# PawBuck.API — ECS Fargate / ALB (listen on 8080)
# Build: docker build -t pawbuck-api:latest -f Dockerfile .
# Run:  docker run --rm -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Production pawbuck-api:latest

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["PawBuck.API.csproj", "./"]
RUN dotnet restore "PawBuck.API.csproj"
COPY . .
RUN dotnet publish "PawBuck.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PawBuck.API.dll"]
