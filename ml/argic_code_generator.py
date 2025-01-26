import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import numpy as np

class ArgicCodeGenerator:
    def __init__(self):
        # Initialize encoders for each component
        self.manufacturer_encoder = LabelEncoder()
        self.model_encoder = LabelEncoder()
        self.glass_type_encoder = LabelEncoder()
        self.color_encoder = LabelEncoder()
        
        # Initialize classifiers
        self.manufacturer_classifier = RandomForestClassifier()
        self.model_classifier = RandomForestClassifier()
        self.glass_type_classifier = RandomForestClassifier()
        self.color_classifier = RandomForestClassifier()
        
        # Training data from the TypeScript mappings
        self.train_data()

    def train_data(self):
        # Convert existing mappings to training data
        manufacturer_data = {
            'manufacturer': [
                'ALFA ROMEO', 'AUDI', 'BMW', 'BOVA', 'CHEVROLET', 'CHRYSLER', 'CITROEN',
                'DACIA', 'DAEWOO', 'DAF', 'DAIHATSU', 'FIAT', 'FORD', 'HONDA', 'HYUNDAI',
                'KIA', 'LAND ROVER', 'LEXUS', 'MAZDA', 'MERCEDES', 'MINI', 'MITSUBISHI',
                'NISSAN', 'OPEL', 'PEUGEOT', 'RENAULT', 'SEAT', 'SKODA', 'TOYOTA',
                'VOLKSWAGEN', 'VOLVO'
            ],
            'code': [
                '20', '85', '24', 'BO', '30', 'A2', '27', '72', '30', '46', '29', '33',
                '41', '47', '52', '54', '60', '62', '66', '70', '72', '74', '76', '78',
                '80', '82', '84', '86', '90', '92', '94'
            ]
        }
        
        model_data = {
            'model': [
                # BMW Models
                '1 SERIES E81', '1 SERIES F20', '2 SERIES F45', '2 SERIES F46',
                '3 SERIES E30', '3 SERIES E36', '3 SERIES E46', '3 SERIES E90',
                '3 SERIES E92', '3 SERIES E93', '3 SERIES F30', '3 SERIES GT F34',
                '4 SERIES F32', '4 SERIES F33', '5 SERIES E34', '5 SERIES E39',
                # Audi Models
                'A3', 'A4', 'A6', '80 II COUPE', '80 III/IV SEDAN', '80 V SEDAN',
                # Other manufacturers...
                'CEED I', 'CEED II', 'PICANTO II', 'RIO III', 'SORENTO II',
                'SPORTAGE III', 'SPORTAGE IV'
            ],
            'code': [
                '48', '67', '77', '79', '25', '31', '36', '47', '54', '50', '65',
                '69', '71', '75', '26', '34', '54', '47', '40', '28', '26', '34',
                '70', '80', '60', '65', '75', '85', '90'
            ]
        }
        
        glass_type_data = {
            'window_type': [
                'WINDSHIELD', 'ALT_WINDSHIELD', 'WINDSHIELD_ACC', 'REAR_WINDOW',
                'REAR_WINDOW_ACC', 'SIDE_FLAT', 'SIDE_FLAT_ACC', 'SIDE_LEFT',
                'SIDE_LEFT_ACC', 'SIDE_RIGHT', 'SIDE_RIGHT_ACC'
            ],
            'code': [
                'A', 'C', 'D', 'B', 'E', 'F', 'H', 'L', 'M', 'R', 'T'
            ]
        }
        
        color_data = {
            'color': [
                'CLEAR', 'BLUE', 'GREEN', 'BRONZE', 'GREY', 'LIGHT_GREEN',
                'DARK_BLUE', 'SOLAR_CONTROL'
            ],
            'code': [
                'CL', 'BL', 'GN', 'BZ', 'GY', 'LG', 'BD', 'SC'
            ]
        }

        # Convert to DataFrames
        self.manufacturer_df = pd.DataFrame(manufacturer_data)
        self.model_df = pd.DataFrame(model_data)
        self.glass_type_df = pd.DataFrame(glass_type_data)
        self.color_df = pd.DataFrame(color_data)

        # Train encoders and classifiers
        self._train_component('manufacturer')
        self._train_component('model')
        self._train_component('glass_type')
        self._train_component('color')

    def _train_component(self, component_type):
        if component_type == 'manufacturer':
            df = self.manufacturer_df
            feature_col = 'manufacturer'
            target_col = 'code'
            classifier = self.manufacturer_classifier
            encoder = self.manufacturer_encoder
        elif component_type == 'model':
            df = self.model_df
            feature_col = 'model'
            target_col = 'code'
            classifier = self.model_classifier
            encoder = self.model_encoder
        # ... similar for other components

        # Encode features
        X = encoder.fit_transform(df[feature_col]).reshape(-1, 1)
        y = df[target_col]

        # Train classifier
        classifier.fit(X, y)

    def generate_code(self, vehicle_details, selected_windows, specifications):
        # Generate manufacturer code
        manufacturer_encoded = self.manufacturer_encoder.transform([[vehicle_details['manufacturer']]])
        manufacturer_code = self.manufacturer_classifier.predict(manufacturer_encoded)[0]

        # Generate model code
        model_encoded = self.model_encoder.transform([[vehicle_details['model']]])
        model_code = self.model_classifier.predict(model_encoded)[0]

        # Generate glass type code
        window_type = self._determine_window_type(selected_windows)
        glass_encoded = self.glass_type_encoder.transform([[window_type]])
        glass_code = self.glass_type_classifier.predict(glass_encoded)[0]

        # Generate color code
        color_encoded = self.color_encoder.transform([[specifications['color']]])
        color_code = self.color_classifier.predict(color_encoded)[0]

        # Combine all codes
        return f"{manufacturer_code}{model_code}{glass_code}{color_code}"

    def _determine_window_type(self, selected_windows):
        # Window type priorities based on the matrix
        window_priorities = {
            'jqvmap1_ws': 'WINDSHIELD',        # A
            'jqvmap1_df': 'ALT_WINDSHIELD',    # C
            'jqvmap1_dg': 'WINDSHIELD_ACC',    # D
            'jqvmap1_rw': 'REAR_WINDOW',       # B
            'jqvmap1_qr': 'REAR_WINDOW_ACC',   # E
            'jqvmap1_dd': 'SIDE_FLAT',         # F
            'jqvmap1_dr': 'SIDE_FLAT_ACC',     # H
            'jqvmap1_qg': 'SIDE_LEFT',         # L
            'jqvmap1_vf': 'SIDE_LEFT_ACC',     # M
            'jqvmap1_vr': 'SIDE_RIGHT',        # R
            'jqvmap1_qf': 'SIDE_RIGHT_ACC'     # T
        }
        
        for window_id in selected_windows:
            if window_id in window_priorities:
                return window_priorities[window_id]
        
        return 'WINDSHIELD'  # default 