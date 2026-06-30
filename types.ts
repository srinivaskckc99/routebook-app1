import { AndroidFile } from './types';

export const androidProjectFiles: AndroidFile[] = [
  {
    path: 'app/src/main/java/com/routebook/app/data/local/LocationEntity.kt',
    name: 'LocationEntity.kt',
    language: 'kotlin',
    description: 'Room Entity definition representing a business location note with latitude, longitude, and extensible metadata fields in SQLite database.',
    content: `package com.routebook.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Represents a highly extensible offline business location in RouteBook.
 * Designed using Room annotations mapping directly to SQLite database rows.
 */
@Entity(tableName = "locations")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    @ColumnInfo(name = "shop_name")
    val shopName: String,
    
    @ColumnInfo(name = "latitude")
    val latitude: Double,
    
    @ColumnInfo(name = "longitude")
    val longitude: Double,
    
    @ColumnInfo(name = "address")
    val address: String,
    
    @ColumnInfo(name = "notes")
    val notes: String = "",
    
    @ColumnInfo(name = "created_at", defaultValue = "0")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "updated_at", defaultValue = "0")
    val updatedAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "category")
    val category: String = "Client",

    /**
     * Extensible key-value metadata field (JSON serialized string).
     * This allows future columns and custom enterprise attributes to be
     * added dynamically in future app updates without breaking backward compatibility
     * or requiring complex SQLite schema migrations.
     */
    @ColumnInfo(name = "ext_metadata")
    val extMetadata: String? = null
)`
  },
  {
    path: 'app/src/main/java/com/routebook/app/data/local/LocationDao.kt',
    name: 'LocationDao.kt',
    language: 'kotlin',
    description: 'Data Access Object (DAO) providing database query functions for Locations.',
    content: `package com.routebook.app.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/**
 * Room Data Access Object defining core database queries.
 */
@Dao
interface LocationDao {

    @Query("SELECT * FROM locations ORDER BY created_at DESC")
    fun getAllLocations(): Flow<List<LocationEntity>>

    @Query("""
        SELECT * FROM locations 
        WHERE shop_name LIKE :query 
        OR address LIKE :query 
        OR notes LIKE :query 
        ORDER BY created_at DESC
    """)
    fun searchLocations(query: String): Flow<List<LocationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(location: LocationEntity)

    @Delete
    suspend fun deleteLocation(location: LocationEntity)
}`
  },
  {
    path: 'app/src/main/java/com/routebook/app/data/local/RouteBookDatabase.kt',
    name: 'RouteBookDatabase.kt',
    language: 'kotlin',
    description: 'Main Room database builder configuration class with thread-safe singleton and backward-compatible schema migration setup.',
    content: `package com.routebook.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Abstract Room Database class providing the main instance.
 * Schema version upgraded to 2 to incorporate business coordinates and dates.
 */
@Database(
    entities = [LocationEntity::class], 
    version = 2, 
    exportSchema = false
)
abstract class RouteBookDatabase : RoomDatabase() {

    abstract fun locationDao(): LocationDao

    companion object {
        @Volatile
        private var INSTANCE: RouteBookDatabase? = null

        /**
         * Schema migration from Version 1 (legacy name/timestamp) to 2 (new business fields).
         * This migration strategy allows old user records to be preserved without losing notes.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // 1. Add new latitude & longitude columns with non-null defaults (0.0)
                db.execSQL("ALTER TABLE locations ADD COLUMN latitude REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE locations ADD COLUMN longitude REAL NOT NULL DEFAULT 0.0")
                
                // 2. Add created_at & updated_at date columns with non-null defaults
                db.execSQL("ALTER TABLE locations ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE locations ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0")
                
                // 3. Add extensible dynamic JSON metadata column (nullable)
                db.execSQL("ALTER TABLE locations ADD COLUMN ext_metadata TEXT")

                // 4. Migrate old 'name' column value to 'shop_name' column or rename columns cleanly.
                // SQLite ALTER TABLE RENAME COLUMN is supported in Android 8.0+ / SQLite 3.25.0+.
                db.execSQL("ALTER TABLE locations RENAME COLUMN name TO shop_name")
                
                // 5. Populate created_at and updated_at with values from the old timestamp column
                db.execSQL("UPDATE locations SET created_at = timestamp, updated_at = timestamp WHERE timestamp IS NOT NULL")
            }
        }

        fun getDatabase(context: Context): RouteBookDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    RouteBookDatabase::class.java,
                    "routebook_database"
                )
                // Registering the migration plan guarantees that existing local databases do not crash!
                .addMigrations(MIGRATION_1_2)
                // Fallback option ensures the database can rebuild if migration fails during severe developer overrides
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/routebook/app/data/repository/LocationRepository.kt',
    name: 'LocationRepository.kt',
    language: 'kotlin',
    description: 'Repository abstraction class to manage data operations and separate concerns.',
    content: `package com.routebook.app.data.repository

import com.routebook.app.data.local.LocationDao
import com.routebook.app.data.local.LocationEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pattern implementation for robust data separation.
 */
@Singleton
class LocationRepository @Inject constructor(
    private val locationDao: LocationDao
) {
    val allLocations: Flow<List<LocationEntity>> = locationDao.getAllLocations()

    fun searchLocations(query: String): Flow<List<LocationEntity>> {
        val dbQuery = "%$query%"
        return locationDao.searchLocations(dbQuery)
    }

    suspend fun insertLocation(location: LocationEntity) {
        locationDao.insertLocation(location)
    }

    suspend fun deleteLocation(location: LocationEntity) {
        locationDao.deleteLocation(location)
    }
}`
  },
  {
    path: 'app/src/main/java/com/routebook/app/ui/theme/Color.kt',
    name: 'Color.kt',
    language: 'kotlin',
    description: 'Color palette definition utilizing Material Design 3 guidelines.',
    content: `package com.routebook.app.ui.theme

import androidx.compose.ui.graphics.Color

// Primary Colors: Slate Blue & Deep Muted Teal
val PrimaryLight = Color(0xFF0F172A)      // Deep Slate Gray
val OnPrimaryLight = Color(0xFFFFFFFF)
val PrimaryContainerLight = Color(0xFFE2E8F0) // Soft Ice Blue
val OnPrimaryContainerLight = Color(0xFF0F172A)

// Secondary Colors: Muted Terracotta/Clay (Warm & grounded)
val SecondaryLight = Color(0xFF9A3412)    // Warm Clay/Brown
val OnSecondaryLight = Color(0xFFFFFFFF)
val SecondaryContainerLight = Color(0xFFFFEDD5) // Light Warm Peach
val OnSecondaryContainerLight = Color(0xFF431407)

// Background & Neutral
val BackgroundLight = Color(0xFFF8FAFC)   // Soft off-white
val OnBackgroundLight = Color(0xFF0F172A)
val SurfaceLight = Color(0xFFFFFFFF)
val OnSurfaceLight = Color(0xFF0F172A)
val SurfaceVariantLight = Color(0xFFF1F5F9)
val OnSurfaceVariantLight = Color(0xFF475569)

// Dark Theme Palette
val PrimaryDark = Color(0xFFE2E8F0)
val OnPrimaryDark = Color(0xFF0F172A)
val PrimaryContainerDark = Color(0xFF334155)
val OnPrimaryContainerDark = Color(0xFFF8FAFC)

val SecondaryDark = Color(0xFFFDBA74)     // Soft Peach Orange
val OnSecondaryDark = Color(0xFF431407)
val SecondaryContainerDark = Color(0xFF7C2D12)
val OnSecondaryContainerDark = Color(0xFFFFEDD5)

val BackgroundDark = Color(0xFF0F172A)    // Rich Slate Navy
val OnBackgroundDark = Color(0xFFF8FAFC)
val SurfaceDark = Color(0xFF1E293B)       // Muted Dark Slate
val OnSurfaceDark = Color(0xFFF8FAFC)
val SurfaceVariantDark = Color(0xFF334155)
val OnSurfaceVariantDark = Color(0xFFCBD5E1)`
  },
  {
    path: 'app/src/main/java/com/routebook/app/ui/theme/Theme.kt',
    name: 'Theme.kt',
    language: 'kotlin',
    description: 'The overall Material Design 3 layout Theme configuring colors and system bars.',
    content: `package com.routebook.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = PrimaryLight,
    onPrimary = OnPrimaryLight,
    primaryContainer = PrimaryContainerLight,
    onPrimaryContainer = OnPrimaryContainerLight,
    secondary = SecondaryLight,
    onSecondary = OnSecondaryLight,
    secondaryContainer = SecondaryContainerLight,
    onSecondaryContainer = OnSecondaryContainerLight,
    background = BackgroundLight,
    onBackground = OnBackgroundLight,
    surface = SurfaceLight,
    onSurface = OnSurfaceLight,
    surfaceVariant = SurfaceVariantLight,
    onSurfaceVariant = OnSurfaceVariantLight
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryDark,
    onPrimary = OnPrimaryDark,
    primaryContainer = PrimaryContainerDark,
    onPrimaryContainer = OnPrimaryContainerDark,
    secondary = SecondaryDark,
    onSecondary = OnSecondaryDark,
    secondaryContainer = SecondaryContainerDark,
    onSecondaryContainer = OnSecondaryContainerDark,
    background = BackgroundDark,
    onBackground = OnBackgroundDark,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = OnSurfaceVariantDark
)

@Composable
fun RouteBookTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true, // Enables dynamic colors for Android 12+
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES_S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography, // Custom typography standard definitions
        content = content
    )
}`
  },
  {
    path: 'app/src/main/java/com/routebook/app/ui/splash/SplashScreen.kt',
    name: 'SplashScreen.kt',
    language: 'kotlin',
    description: 'Jetpack Compose Splash screen implementation with smooth logo scale-in and fade animations.',
    content: `package com.routebook.app.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.routebook.app.R
import kotlinx.coroutines.delay

/**
 * Beautiful Material Design 3 Splash Screen.
 */
@Composable
fun SplashScreen(onAnimationFinished: () -> Unit) {
    val scale = remember { Animatable(0.5f) }
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(key1 = true) {
        // Animate scale and alpha concurrently
        scale.animateTo(
            targetValue = 1.0f,
            animationSpec = tween(durationMillis = 1000)
        )
        alpha.animateTo(
            targetValue = 1.0f,
            animationSpec = tween(durationMillis = 800)
        )
        // Keep splash visible for branding duration
        delay(1500)
        onAnimationFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_routebook_logo),
                contentDescription = "RouteBook App Logo",
                modifier = Modifier
                    .size(120.dp)
                    .scale(scale.value)
                    .alpha(alpha.value)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "RouteBook",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.alpha(alpha.value)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Your Offline Business Location Notebook",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.alpha(alpha.value)
            )
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/routebook/app/ui/welcome/WelcomeScreen.kt',
    name: 'WelcomeScreen.kt',
    language: 'kotlin',
    description: 'Jetpack Compose Home Screen displaying saved locations list, large search bar, and large Add Location action button.',
    content: `package com.routebook.app.ui.welcome

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.routebook.app.data.local.LocationEntity

/**
 * Premium Home Screen for RouteBook.
 * Clean, modern layout designed with Material Design 3 for business users.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WelcomeScreen(
    locations: List<LocationEntity>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onSaveLocation: (name: String, address: String, category: String, notes: String) -> Unit,
    onDeleteLocation: (LocationEntity) -> Unit
) {
    val context = LocalContext.current

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.Top
        ) {
            // 1. At the top show: RouteBook
            Text(
                text = "RouteBook",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier
                    .padding(top = 16.dp, bottom = 12.dp)
            )

            // 2. Below that place a large search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {}, // Design mode: search logic omitted per user intent
                enabled = false, // Design mode static view
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                placeholder = { Text("Search saved locations...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search Icon") },
                shape = CircleShape,
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    disabledBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 3. Below the search bar place a large "Add Location" button
            Button(
                onClick = {}, // Design mode: click omitted per user intent
                enabled = false, // Design mode static view
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.9f),
                    disabledContentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Icon",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Add Location",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // 4. Below that display the heading: Saved Locations
            Text(
                text = "Saved Locations",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            // 5. If no locations exist display: "No saved locations yet."
            // Otherwise show the list of saved locations.
            if (locations.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "No saved locations yet.",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    items(locations, key = { it.id }) { location ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = location.shopName,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text(location.category) }
                                    )
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = location.address,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )

                                if (location.notes.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Notes: \${location.notes}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    Button(
                                        onClick = {
                                            val uri = Uri.parse("geo:0,0?q=\${Uri.encode(location.address)}")
                                            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                                                setPackage("com.google.android.apps.maps")
                                            }
                                            context.startActivity(intent)
                                        },
                                        shape = CircleShape,
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                                        ),
                                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Navigation,
                                            contentDescription = null,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Navigate",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/routebook/app/MainActivity.kt',
    name: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Main Activity hosting Jetpack Compose layout, state initialization, and Splash navigation lifecycle.',
    content: `package com.routebook.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.routebook.app.data.local.LocationEntity
import com.routebook.app.data.local.RouteBookDatabase
import com.routebook.app.data.repository.LocationRepository
import com.routebook.app.ui.splash.SplashScreen
import com.routebook.app.ui.theme.RouteBookTheme
import com.routebook.app.ui.welcome.WelcomeScreen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Main ViewModel for RouteBook.
 * Encapsulates Room DB queries with stable thread scheduling and lifecycle state-flow binding.
 * Completely avoids main-thread disk blockages, memory leaks, and unnecessary background battery draw.
 */
class MainViewModel(private val repository: LocationRepository) : ViewModel() {
    
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery
    
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val locations: StateFlow<List<LocationEntity>> = _searchQuery
        .flatMapLatest { query ->
            if (query.isEmpty()) {
                repository.allLocations
            } else {
                repository.searchLocations("%$query%")
            }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun insertLocation(name: String, address: String, category: String, notes: String) {
        viewModelScope.launch {
            repository.insertLocation(
                LocationEntity(
                    shopName = name,
                    address = address,
                    category = category,
                    notes = notes
                )
            )
        }
    }

    fun deleteLocation(location: LocationEntity) {
        viewModelScope.launch {
            repository.deleteLocation(location)
        }
    }
}

class MainViewModelFactory(private val repository: LocationRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MainViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

/**
 * Entry activity for RouteBook, executing offline SQLite/Room initialization.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup local Room DB offline
        val database = RouteBookDatabase.getDatabase(this)
        val repository = LocationRepository(database.locationDao())
        val viewModelFactory = MainViewModelFactory(repository)
        
        setContent {
            RouteBookTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var showSplashScreen by rememberSaveable { mutableStateOf(true) }
                    
                    if (showSplashScreen) {
                        SplashScreen(onAnimationFinished = {
                            showSplashScreen = false
                        })
                    } else {
                        // Obtain the stateful ViewModel bound securely to the Application lifecycle
                        val viewModel: MainViewModel = viewModel(factory = viewModelFactory)
                        
                        // collectAsStateWithLifecycle pauses Flow collections when the UI is covered or minimized,
                        // completely stopping CPU waste and battery drain in the background.
                        val locationsState by viewModel.locations.collectAsStateWithLifecycle()
                        val searchQueryState by viewModel.searchQuery.collectAsStateWithLifecycle()

                        WelcomeScreen(
                            locations = locationsState,
                            searchQuery = searchQueryState,
                            onSearchQueryChange = { viewModel.setSearchQuery(it) },
                            onSaveLocation = { name, address, category, notes ->
                                viewModel.insertLocation(name, address, category, notes)
                            },
                            onDeleteLocation = { location ->
                                viewModel.deleteLocation(location)
                            }
                        )
                    }
                }
            }
        }
    }
}`
  },
  {
    path: 'app/build.gradle.kts',
    name: 'build.gradle.kts',
    language: 'gradle',
    description: 'App Gradle build file configuring SDK SDK-target compiler flags and importing Jetpack Compose & Room.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.routebook.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.routebook.app"
        minSdk = 29 // Android 10 (Q)
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // Prepped for Play Store (configure release keys)
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core Android libraries
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose & Material Design 3
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Offline Persistence: Room Database
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    kapt("androidx.room:room-compiler:$roomVersion")

    // Coroutines for background threading
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
} `
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Android manifest file declaring core app launch state and permissions (Internet, Maps).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Declares network access standard permissions for Google Maps loading -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.RouteBook"
        tools:targetApi="31">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.RouteBook.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  },
  {
    path: 'app/src/main/java/com/routebook/app/worker/VisitReminderWorker.kt',
    name: 'VisitReminderWorker.kt',
    language: 'kotlin',
    description: 'Background worker executing offline visit reminders calculation and dispatching local notifications using Android WorkManager.',
    content: `package com.routebook.app.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.routebook.app.MainActivity
import com.routebook.app.data.local.RouteBookDatabase
import com.routebook.app.data.local.LocationEntity
import kotlinx.coroutines.flow.first
import org.json.JSONObject

/**
 * Background worker executing offline visit reminders calculation and dispatching local notifications.
 * Implemented using Android Jetpack WorkManager, ensuring reliable scheduled execution even if the app is closed.
 */
class VisitReminderWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val CHANNEL_ID = "visit_reminders_channel"
        private const val NOTIFICATION_ID_BASE = 1000
    }

    override suspend fun doWork(): Result {
        val database = RouteBookDatabase.getInstance(applicationContext)
        val locationDao = database.locationDao()
        
        try {
            // Get all locations from the SQLite database
            val locations = locationDao.getAllLocations().first()
            var overdueCount = 0
            val currentTime = System.currentTimeMillis()

            for (location in locations) {
                // Parse the reminder configuration from our extensible metadata field
                val metadataJson = location.extMetadata?.let { JSONObject(it) } ?: JSONObject()
                if (!metadataJson.has("reminderInterval")) continue

                val reminderDays = metadataJson.optLong("reminderInterval", 0L)
                if (reminderDays <= 0) continue

                // Find the last visit timestamp or fallback to location creation time
                val lastVisitTime = if (metadataJson.has("visitHistory")) {
                    val historyArray = metadataJson.getJSONArray("visitHistory")
                    var maxTime = location.createdAt
                    for (i in 0 until historyArray.length()) {
                        val visitObj = historyArray.getJSONObject(i)
                        val timestamp = visitObj.optLong("timestamp", 0L)
                        if (timestamp > maxTime) {
                            maxTime = timestamp
                        }
                    }
                    maxTime
                } else {
                    location.createdAt
                }

                val intervalMs = reminderDays * 24 * 60 * 60 * 1000L
                val nextVisitTime = lastVisitTime + intervalMs

                if (currentTime > nextVisitTime) {
                    overdueCount++
                    // Show custom notification for overdue business stops
                    showOverdueNotification(location, nextVisitTime)
                }
            }

            return Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            return Result.retry()
        }
    }

    private fun showOverdueNotification(location: LocationEntity, nextVisitTime: Long) {
        val context = applicationContext
        createNotificationChannel()

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Visit Overdue: \${location.shopName}")
            .setContentText("A visit to \${location.shopName} was due. Tap to view dispatch checklist.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(
                NOTIFICATION_ID_BASE + location.id.toInt(), 
                notification
            )
        } catch (e: SecurityException) {
            // Handle notification permission lack gracefully on Android 13+
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Visit Reminders"
            val descriptionText = "Notifications alerting about overdue offline location visits"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}`
  }
];
