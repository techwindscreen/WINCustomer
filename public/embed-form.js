(function() {
    // Create the form HTML
    const formHTML = `
        <div id="windscreen-form-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 24px;">
            <div id="windscreen-error-container"></div>
            <div id="windscreen-success-container"></div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <!-- VEHICLE REGISTRATION FIELD -->
                <div style="margin-bottom: 16px;">
                    <label for="windscreen_vehicle_registration" style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">VEHICLE REGISTRATION</label>
                    <input
                        name="vehicle_registration"
                        type="text"
                        id="windscreen_vehicle_registration"
                        style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; transition: all 0.3s ease; background-color: white;"
                        placeholder="Enter Number Plate"
                    />
                </div>

                <!-- VEHICLE LOCATION FIELD -->
                <div style="margin-bottom: 16px;">
                    <label for="windscreen_location" style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">POSTCODE</label>
                    <input
                        name="location"
                        type="text"
                        id="windscreen_location"
                        style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; transition: all 0.3s ease; background-color: white;"
                        placeholder="Enter Postcode"
                    />
                </div>
            </div>

            <!-- LINK TO SEARCH CAR MANUALLY -->
            <a id="windscreen-manual-link" href="#" style="display: block; text-align: center; color: #6b7280; font-size: 14px; text-decoration: underline; margin-bottom: 20px; cursor: pointer;">
                Not sure? Enter car details manually
            </a>
            
            <!-- LET'S GO BUTTON -->
            <div style="text-align: center;">
                <button id="windscreen-submit-btn" type="button" style="background-color: #0FB8C1; color: white; border: none; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; width: 100%; max-width: 200px;">
                    Let's Go
                </button>
            </div>
        </div>

        <style>
            @media (max-width: 640px) {
                #windscreen-form-container > div:first-of-type {
                    grid-template-columns: 1fr !important;
                }
            }
            
            #windscreen_vehicle_registration:focus, #windscreen_location:focus {
                outline: none;
                border-color: #0FB8C1;
                box-shadow: 0 0 0 3px rgba(15, 184, 193, 0.1);
            }
            
            #windscreen_vehicle_registration::placeholder, #windscreen_location::placeholder {
                color: #9ca3af;
            }
            
            #windscreen-manual-link:hover {
                color: #0FB8C1;
            }
            
            #windscreen-submit-btn:hover {
                background-color: #0DA6AE;
                transform: translateY(-1px);
            }
            
            #windscreen-submit-btn:active {
                transform: translateY(0);
            }
            
            .windscreen-error-message {
                background-color: #fef2f2;
                border: 1px solid #fca5a5;
                color: #dc2626;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                font-size: 14px;
            }
            
            .windscreen-success-message {
                background-color: #f0fdf4;
                border: 1px solid #86efac;
                color: #16a34a;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                font-size: 14px;
            }
        </style>
    `;

    // Validation functions
    function isValidUKPostcode(postcode) {
        const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
        return postcodeRegex.test(postcode.trim());
    }

    function isValidUKVehicleReg(reg) {
        const regRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{3}[A-Z]{3}$|^[A-Z]{2}[0-9]{2} [A-Z]{3}$|^[A-Z][0-9]{3} [A-Z]{3}$/i;
        return regRegex.test(reg.trim());
    }

    function showError(message) {
        const errorContainer = document.getElementById('windscreen-error-container');
        const successContainer = document.getElementById('windscreen-success-container');
        if (successContainer) successContainer.innerHTML = '';
        if (errorContainer) errorContainer.innerHTML = `<div class="windscreen-error-message">${message}</div>`;
    }

    function showSuccess(message) {
        const errorContainer = document.getElementById('windscreen-error-container');
        const successContainer = document.getElementById('windscreen-success-container');
        if (errorContainer) errorContainer.innerHTML = '';
        if (successContainer) successContainer.innerHTML = `<div class="windscreen-success-message">${message}</div>`;
    }

    function clearMessages() {
        const errorContainer = document.getElementById('windscreen-error-container');
        const successContainer = document.getElementById('windscreen-success-container');
        if (errorContainer) errorContainer.innerHTML = '';
        if (successContainer) successContainer.innerHTML = '';
    }

    // Initialize the widget
    window.WindscreenCompareWidget = {
        init: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Container not found:', containerId);
                return;
            }

            container.innerHTML = formHTML;

            // Add event listeners
            const submitBtn = document.getElementById('windscreen-submit-btn');
            const manualLink = document.getElementById('windscreen-manual-link');
            const vehicleRegInput = document.getElementById('windscreen_vehicle_registration');
            const locationInput = document.getElementById('windscreen_location');

            if (submitBtn) {
                submitBtn.addEventListener('click', function() {
                    clearMessages();

                    const vehicleReg = vehicleRegInput ? vehicleRegInput.value.trim() : '';
                    const postcode = locationInput ? locationInput.value.trim() : '';

                    // Validation
                    if (!vehicleReg || !postcode) {
                        showError('Please fill in all fields');
                        return;
                    }

                    if (!isValidUKVehicleReg(vehicleReg)) {
                        showError('Please enter a valid UK vehicle registration');
                        return;
                    }

                    if (!isValidUKPostcode(postcode)) {
                        showError('Please enter a valid UK postcode');
                        return;
                    }

                    // Generate quote ID
                    const timestamp = new Date().getTime().toString().slice(-6);
                    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
                    const quoteID = `WIN${timestamp}${random}`;

                    // Redirect to damage location page
                    const url = `https://winc-customer.vercel.app/damage-location?vehicleReg=${encodeURIComponent(vehicleReg.toUpperCase())}&postcode=${encodeURIComponent(postcode.toUpperCase())}&quoteID=${encodeURIComponent(quoteID)}`;
                    window.open(url, '_blank');
                    showSuccess('Form submitted successfully! Opening in new window...');
                });
            }

            if (manualLink) {
                manualLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.open('https://winc-customer.vercel.app/damage-location', '_blank');
                });
            }

            // Auto-format vehicle registration
            if (vehicleRegInput) {
                vehicleRegInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    
                    // Format based on UK registration patterns
                    if (value.length <= 7) {
                        if (value.length > 4) {
                            value = value.slice(0, 4) + ' ' + value.slice(4);
                        }
                    }
                    
                    e.target.value = value;
                });
            }

            // Auto-format postcode
            if (locationInput) {
                locationInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    
                    // Format UK postcode
                    if (value.length > 3) {
                        value = value.slice(0, -3) + ' ' + value.slice(-3);
                    }
                    
                    e.target.value = value;
                });
            }

            // Load saved data from localStorage if available
            try {
                const savedData = localStorage.getItem('windscreenCompareData');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    if (data.vehicleReg && vehicleRegInput) {
                        vehicleRegInput.value = data.vehicleReg;
                    }
                    if (data.postcode && locationInput) {
                        locationInput.value = data.postcode;
                    }
                }
            } catch (error) {
                console.log('No saved data found');
            }
        }
    };

    // Auto-initialize if there's a container with id 'windscreen-widget'
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('windscreen-widget')) {
            window.WindscreenCompareWidget.init('windscreen-widget');
        }
    });
})(); 