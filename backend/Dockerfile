# Build
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q dependency:go-offline
COPY src src
RUN ./mvnw -q package -DskipTests

# Run
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system sonic
COPY --from=build /app/target/sonic-backend-*.jar app.jar
USER sonic
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
