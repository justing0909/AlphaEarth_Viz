
#10. INTERACTIVE PLANET-MOON PLOT (SHINY APP - ROBUST VERSION)
library(shiny)
library(dplyr)
library(ggplot2)
library(viridis)

#############################################################
# DATA VALIDATION AND PREPARATION
#############################################################

# Check if required objects exist
if(!exists("minimum_embeddings_df")) {
  stop("Error: minimum_embeddings_df not found. Please run chunk #4 first!")
}

if(!exists("association_matrix")) {
  stop("Error: association_matrix not found. Please run chunk #5 first!")
}

if(!exists("embedding_sharing_analysis")) {
  stop("Error: embedding_sharing_analysis not found. Please run chunk #8 first!")
}

# Validate data is not empty
if(nrow(minimum_embeddings_df) == 0) {
  stop("Error: minimum_embeddings_df is empty. No embeddings within tipping point. Try lowering PERCENTAGE_THRESHOLD.")
}

cat("=== DATA VALIDATION PASSED ===\n")
cat("minimum_embeddings_df rows:", nrow(minimum_embeddings_df), "\n")
cat("Unique land covers:", length(unique(minimum_embeddings_df$land_cover)), "\n")

#############################################################
# CONFIGURATION
#############################################################

LAND_COVER_SEPARATION <- 120
PLANET_RADIUS <- 13
MOON_RADIUS_EXCLUSIVE <- 7
MOON_RADIUS_SHARED <- 9
EXCLUSIVE_DISTANCE <- 18
SHARED_DISTANCE_FACTOR <- 0.7

#############################################################
# PREPARE BASE DATA
#############################################################

exclusive_emb <- embedding_sharing_analysis %>%
  filter(type == "Exclusive")

shared_emb <- embedding_sharing_analysis %>%
  filter(type == "Shared") %>%
  arrange(n_land_covers, embedding)

cat("Exclusive embeddings:", nrow(exclusive_emb), "\n")
cat("Shared embeddings:", nrow(shared_emb), "\n")

# Get land covers
land_covers_all <- unique(c(
  unique(exclusive_emb$land_covers),
  unlist(strsplit(shared_emb$land_covers, ", "))
))

# Order by complexity if available
if(exists("complexity_scores") && nrow(complexity_scores) > 0) {
  land_covers_ordered <- complexity_scores %>%
    filter(land_cover %in% land_covers_all) %>%
    arrange(total_embeddings, total_sharing_penalty) %>%
    pull(land_cover)
} else {
  land_covers_ordered <- land_covers_all
}

n_lc <- length(land_covers_ordered)

if(n_lc == 0) {
  stop("Error: No land covers found in data. Check your filtering.")
}

cat("Land covers to display:", n_lc, "\n")

# Position planets
angles <- seq(0, 2*pi, length.out = n_lc + 1)[1:n_lc]

planets <- data.frame(
  land_cover = land_covers_ordered,
  x = LAND_COVER_SEPARATION * cos(angles),
  y = LAND_COVER_SEPARATION * sin(angles),
  angle = angles,
  stringsAsFactors = FALSE
)

# Position exclusive embeddings WITH ASSOCIATION VALUES
moons_exclusive <- data.frame(
  embedding = character(),
  land_cover = character(),
  x = numeric(),
  y = numeric(),
  association = numeric(),
  stringsAsFactors = FALSE
)

connections_exclusive <- data.frame(
  x = numeric(), y = numeric(), xend = numeric(), yend = numeric(),
  stringsAsFactors = FALSE
)

if(nrow(exclusive_emb) > 0) {
  for(lc in land_covers_ordered) {
    lc_embeddings <- exclusive_emb %>%
      filter(land_covers == lc) %>%
      pull(embedding)
    
    n_emb <- length(lc_embeddings)
    if(n_emb == 0) next
    
    planet_pos <- planets[planets$land_cover == lc, ]
    angle_to_planet <- atan2(planet_pos$y, planet_pos$x)
    
    for(i in 1:n_emb) {
      angle_offset <- (i - 1) * (2 * pi / n_emb)
      final_angle <- angle_to_planet + angle_offset
      
      moon_x <- planet_pos$x + EXCLUSIVE_DISTANCE * cos(final_angle)
      moon_y <- planet_pos$y + EXCLUSIVE_DISTANCE * sin(final_angle)
      
      # Get association value from association_matrix (with error handling)
      emb_col <- paste0("imp", lc_embeddings[i])
      
      if(lc %in% rownames(association_matrix) && emb_col %in% colnames(association_matrix)) {
        assoc_value <- association_matrix[lc, emb_col]
      } else {
        assoc_value <- 0
        warning(paste("Association value not found for", lc, "-", lc_embeddings[i]))
      }
      
      moons_exclusive <- rbind(moons_exclusive, data.frame(
        embedding = lc_embeddings[i],
        land_cover = lc,
        x = moon_x,
        y = moon_y,
        association = assoc_value,
        stringsAsFactors = FALSE
      ))
      
      connections_exclusive <- rbind(connections_exclusive, data.frame(
        x = moon_x, y = moon_y,
        xend = planet_pos$x, yend = planet_pos$y,
        stringsAsFactors = FALSE
      ))
    }
  }
}

cat("Exclusive moons positioned:", nrow(moons_exclusive), "\n")

#############################################################
# SHINY APP
#############################################################

ui <- fluidPage(
  titlePanel("Interactive Land Cover Embedding Universe"),
  
  sidebarLayout(
    sidebarPanel(
      width = 3,
      
      h4("Shared Embeddings:"),
      p("Click to toggle visibility", style = "color: gray; font-size: 12px;"),
      
      if(nrow(shared_emb) > 0) {
        checkboxGroupInput(
          "selected_shared",
          NULL,
          choices = setNames(
            shared_emb$embedding, 
            paste0(shared_emb$embedding, 
              " → ", shared_emb$n_land_covers, " covers")
          ),
          selected = NULL
        )
      } else {
        p("No shared embeddings available")
      },
      
      hr(),
      actionButton("select_all", "Select All", class = "btn-primary"),
      actionButton("clear_all", "Clear All", class = "btn-warning"),
      
      hr(),
      h5("Summary:"),
      textOutput("summary_text"),
      
      hr(),
      p(paste0("Threshold: ", if(exists("PERCENTAGE_THRESHOLD")) PERCENTAGE_THRESHOLD else "N/A"), 
        style = "font-size: 11px;"),
      p(paste0("Exclusive: ", nrow(exclusive_emb)), style = "font-size: 11px;"),
      p(paste0("Shared: ", nrow(shared_emb)), style = "font-size: 11px;")
    ),
    
    mainPanel(
      width = 9,
      plotOutput("planet_plot", height = "1000px", width = "1000px")
    )
  )
)

server <- function(input, output, session) {
  
  observeEvent(input$select_all, {
    updateCheckboxGroupInput(session, "selected_shared", 
      selected = shared_emb$embedding)
  })
  
  observeEvent(input$clear_all, {
    updateCheckboxGroupInput(session, "selected_shared", selected = character(0))
  })
  
  output$summary_text <- renderText({
    n_selected <- length(input$selected_shared)
    paste0("Displaying ", n_selected, " of ", nrow(shared_emb), " shared embeddings")
  })
  
  output$planet_plot <- renderPlot({
    
    # Filter shared embeddings based on selection
    selected_shared_emb <- shared_emb %>%
      filter(embedding %in% input$selected_shared)
    
    # Position selected shared embeddings
    moons_shared_selected <- data.frame(
      embedding = character(),
      x = numeric(),
      y = numeric(),
      n_connections = integer(),
      stringsAsFactors = FALSE
    )
    
    connections_shared_selected <- data.frame(
      x = numeric(), y = numeric(), xend = numeric(), yend = numeric(),
      stringsAsFactors = FALSE
    )
    
    if(nrow(selected_shared_emb) > 0) {
      for(i in 1:nrow(selected_shared_emb)) {
        emb <- selected_shared_emb$embedding[i]
        lcs <- strsplit(selected_shared_emb$land_covers[i], ", ")[[1]]
        lcs <- lcs[lcs %in% land_covers_ordered]
        
        if(length(lcs) == 0) next
        
        planet_positions <- planets %>% filter(land_cover %in% lcs)
        
        if(nrow(planet_positions) == 0) next
        
        mean_angle <- mean(planet_positions$angle)
        centroid_x <- mean(planet_positions$x) * SHARED_DISTANCE_FACTOR
        centroid_y <- mean(planet_positions$y) * SHARED_DISTANCE_FACTOR
        
        moons_shared_selected <- rbind(moons_shared_selected, data.frame(
          embedding = emb,
          x = centroid_x,
          y = centroid_y,
          n_connections = length(lcs),
          stringsAsFactors = FALSE
        ))
        
        for(lc in lcs) {
          planet_pos <- planets[planets$land_cover == lc, ]
          connections_shared_selected <- rbind(connections_shared_selected, data.frame(
            x = centroid_x, y = centroid_y,
            xend = planet_pos$x, yend = planet_pos$y,
            stringsAsFactors = FALSE
          ))
        }
      }
    }
    
    # Create plot
    p <- ggplot() +
      coord_fixed() +
      theme_void()
    
    # Exclusive connections
    if(nrow(connections_exclusive) > 0) {
      p <- p + geom_segment(data = connections_exclusive,
        aes(x = x, y = y, xend = xend, yend = yend),
        color = "gray70", alpha = 0.3, linewidth = 0.4)
    }
    
    # Shared connections (only selected)
    if(nrow(connections_shared_selected) > 0) {
      p <- p + geom_segment(data = connections_shared_selected,
        aes(x = x, y = y, xend = xend, yend = yend),
        color = "#D4AF37", alpha = 0.6, linewidth = 1, linetype = "solid")
    }
    
    # Planets
    p <- p +
      geom_point(data = planets, aes(x = x, y = y),
        size = PLANET_RADIUS * 2.5, color = "#2E4057", alpha = 0.85) +
      geom_text(data = planets, aes(x = x, y = y, label = land_cover),
        color = "white", fontface = "bold", size = 3.5)
    
    # Exclusive moons - GREEN GRADIENT BY ASSOCIATION
    if(nrow(moons_exclusive) > 0) {
      p <- p +
        geom_point(data = moons_exclusive, 
          aes(x = x, y = y, fill = association),
          size = MOON_RADIUS_EXCLUSIVE * 2.5, alpha = 0.9, shape = 21, color = "white", stroke = 0.5) +
        geom_text(data = moons_exclusive, aes(x = x, y = y, label = embedding),
          color = "white", fontface = "bold", size = 3) +
        scale_fill_gradient(low = "lightgreen", high = "darkgreen", guide = "none")
    }
    
    # Shared moons (only selected)
    if(nrow(moons_shared_selected) > 0) {
      p <- p +
        geom_point(data = moons_shared_selected, 
          aes(x = x, y = y, size = n_connections),
          color = "#D4AF37", alpha = 0.9, shape = 18) +
        scale_size_continuous(range = c(8, 12), guide = "none") +
        geom_text(data = moons_shared_selected, aes(x = x, y = y, label = embedding),
          color = "white", fontface = "bold", size = 3)
    }
    
    # Title - FIXED: explicit namespace
    p <- p +
      labs(
        title = "Land Cover Embedding Universe",
        subtitle = paste0("Showing ", length(input$selected_shared), " shared embeddings | Green gradient = exclusive (darker = stronger) | Gold = shared")
      ) +
      theme(
        plot.title = element_text(size = 18, face = "bold", hjust = 0.5, margin = ggplot2::margin(b = 5)),
        plot.subtitle = element_text(size = 11, hjust = 0.5, margin = ggplot2::margin(b = 15)),
        plot.background = element_rect(fill = "white", color = NA),
        plot.margin = ggplot2::margin(20, 20, 20, 20)
      )
    
    p
  }, height = 1000, width = 1000)
}

# Run the Shiny app
cat("\n=== LAUNCHING INTERACTIVE APP ===\n")
cat("Configuration:\n")
cat("  - Threshold:", if(exists("PERCENTAGE_THRESHOLD")) PERCENTAGE_THRESHOLD else "N/A", "\n")
cat("  - Planets (land covers):", n_lc, "\n")
cat("  - Exclusive moons:", nrow(moons_exclusive), "\n")
cat("  - Shared embeddings available:", nrow(shared_emb), "\n")
cat("\nGreen exclusive embeddings: darker = stronger association\n")
cat("Gold shared embeddings: size = number of connections\n")
cat("Select shared embeddings from sidebar to visualize\n\n")

shinyApp(ui = ui, server = server)



